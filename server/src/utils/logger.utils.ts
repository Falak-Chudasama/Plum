// src/utils/logger.ts
import { createLogger, format, transports } from 'winston';
const { combine, timestamp, printf, colorize, errors, json } = format;

const isDev = process.env.NODE_ENV !== 'production';

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} ${level}: ${stack || message}`;
});

const logger = createLogger({
    level: isDev ? 'debug' : 'info',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        isDev ? colorize() : format.uncolorize(),
        logFormat
    ),
    transports: [
        new transports.Console({
            format: combine(
                timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                errors({ stack: true }),
                colorize(),
                logFormat
            ),
        }),
        new transports.File({
            filename: 'logs/error.log',
            level: 'error',
        }),
        new transports.File({
            filename: 'logs/combined.log',
        }),
    ],
    exceptionHandlers: [
        new transports.File({ filename: 'logs/exceptions.log' })
    ],
    rejectionHandlers: [
        new transports.File({ filename: 'logs/rejections.log' })
    ]
});

export default logger;
