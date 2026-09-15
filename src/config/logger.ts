import pino from 'pino'; import { config } from './env';

export const logger = pino({ level: config.nodeEnv === 'development' ? 'debug' : 'info', transport: config.nodeEnv === 'development' ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss Z' } } : undefined, });