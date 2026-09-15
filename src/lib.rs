use dynasmrt::{dynasm, DynasmApi, DynasmLabelApi, Assembler, ExecutableBuffer};
use wasm_bindgen::prelude::*;
use std::mem;
use std::slice;

// --- 1. WASI Host Binding Definitions ---

#[repr(C)]
struct IoVec {
    buf_offset: u32,
    buf_len: u32,
}

extern "C" fn host_fd_write(
    fd: i32,
    iovs_ptr: *const IoVec,
    iovs_len: usize,
    nwritten_ptr: *mut usize,
    memory_base: *mut u8,
) -> i32 {
    unsafe {
        let iovs = slice::from_raw_parts(iovs_ptr, iovs_len);
        let mut total = 0;

        for iov in iovs {
            let data_ptr = memory_base.add(iov.buf_offset as usize);
            let bytes = slice::from_raw_parts(data_ptr, iov.buf_len as usize);

            if fd == 1 || fd == 2 {
                print!("{}", String::from_utf8_lossy(bytes));
            }
            total += iov.buf_len as usize;
        }

        if !nwritten_ptr.is_null() {
            *nwritten_ptr = total;
        }
    }
    0 // ERRNO_SUCCESS
}

// --- 2. JIT Translation Engine with Control Flow ---

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum BlockType {
    Block,
    Loop,
    If,
}

pub struct ControlFrame {
    pub block_type: BlockType,
    pub stack_depth: usize,
    pub label_entry: dynasmrt::DynamicLabel,
    pub label_exit: dynasmrt::DynamicLabel,
}

#[derive(Debug, Clone)]
pub enum WasmOp {
    I32Const(i32),
    I32Add,
    I32Eqz,
    Block,
    Loop,
    BrIf(u32),
    End,
    CallWasiFdWrite,
    Return,
}

pub struct JitCompiler {
    ops: Vec<WasmOp>,
}

impl JitCompiler {
    pub fn new(ops: Vec<WasmOp>) -> Self {
        Self { ops }
    }

    pub fn compile(&self) -> Result<ExecutableBuffer, String> {
        let mut ops = Assembler::new().map_err(|e| e.to_string())?;
        let mut control_stack: Vec<ControlFrame> = Vec::new();
        let mut virtual_stack: Vec<String> = Vec::new();

        for op in &self.ops {
            match op {
                WasmOp::I32Const(val) => {
                    if virtual_stack.is_empty() {
                        dynasm!(ops; mov rax, *val as i64);
                        virtual_stack.push("rax".into());
                    } else {
                        dynasm!(ops; mov rcx, *val as i64);
                        virtual_stack.push("rcx".into());
                    }
                }
                WasmOp::I32Add => {
                    let rhs = virtual_stack.pop().ok_or("Stack underflow")?;
                    let lhs = virtual_stack.pop().ok_or("Stack underflow")?;
                    if lhs == "rax" && rhs == "rcx" {
                        dynasm!(ops; add rax, rcx);
                        virtual_stack.push("rax".into());
                    }
                }
                WasmOp::I32Eqz => {
                    dynasm!(ops
                        ; test rax, rax
                        ; setz al
                        ; movzx rax, al
                    );
                }
                WasmOp::Block => {
                    let label_exit = ops.new_dynamic_label();
                    let label_entry = ops.new_dynamic_label();
                    control_stack.push(ControlFrame {
                        block_type: BlockType::Block,
                        stack_depth: virtual_stack.len(),
                        label_entry,
                        label_exit,
                    });
                }
                WasmOp::Loop => {
                    let label_entry = ops.new_dynamic_label();
                    let label_exit = ops.new_dynamic_label();
                    ops.define_dynamic_label(label_entry);
                    control_stack.push(ControlFrame {
                        block_type: BlockType::Loop,
                        stack_depth: virtual_stack.len(),
                        label_entry,
                        label_exit,
                    });
                }
                WasmOp::BrIf(depth) => {
                    let target_idx = control_stack.len() - 1 - (*depth as usize);
                    let target_frame = &control_stack[target_idx];
                    dynasm!(ops; test rax, rax);

                    match target_frame.block_type {
                        BlockType::Block => {
                            let exit_label = target_frame.label_exit;
                            dynasm!(ops; jnz =>exit_label);
                        }
                        BlockType::Loop => {
                            let entry_label = target_frame.label_entry;
                            dynasm!(ops; jnz =>entry_label);
                        }
                        BlockType::If => todo!("If branch implementation"),
                    }
                }
                WasmOp::End => {
                    if let Some(frame) = control_stack.pop() {
                        ops.define_dynamic_label(frame.label_exit);
                    }
                }
                WasmOp::CallWasiFdWrite => {
                    let fn_addr = host_fd_write as usize;
                    dynasm!(ops
                        ; mov r8, rax
                        ; mov rax, QWORD fn_addr as i64
                        ; call rax
                    );
                }
                WasmOp::Return => {
                    dynasm!(ops; ret);
                }
            }
        }

        ops.finalize().map_err(|e| e.to_string())
    }
}
