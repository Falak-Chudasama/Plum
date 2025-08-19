import fs from 'fs';
import path from 'path';
import { createLogger, format, transports, Logger } from 'winston';
import morgan from 'morgan';
import { Request, Response } from 'express';

const logDir = path.resolve('logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const { combine, timestamp, printf, colorize, uncolorize } = format;

const createUnifiedFormatter = (truncate: boolean) => {
    return printf(({ timestamp, level, message, stack, http }) => {
        if (http) {
            const msg = message as string;
            const parts = msg.trim().split(' ');
            const method = parts[0];
            const requestPath = parts.slice(1).join(' ');
            let domainAndPath = `api.plum.com${requestPath}`;

            if (truncate && domainAndPath.length > 45) {
                domainAndPath = `${domainAndPath.slice(0, 40)}...${domainAndPath.slice(-5)}`;
            }

            const methodAndUrl = `${method} ${domainAndPath}`;
            return `${timestamp} | ${methodAndUrl}`;
        }

        const logMessage = stack || message;
        return `${timestamp} | ${level.toUpperCase()} | ${logMessage}`;
    });
};

const logger: Logger = createLogger({
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    transports: [
        new transports.Console({
            format: combine(
                colorize(),
                timestamp({ format: 'DD-MMM-YYYY h:mm:ss A' }),
                createUnifiedFormatter(true)
            ),
        }),
        new transports.File({
            filename: path.join(logDir, 'combined.log'),
            format: combine(
                timestamp({ format: 'DD-MMM-YYYY h:mm:ss A' }),
                uncolorize(),
                createUnifiedFormatter(false)
            ),
        }),
        new transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            format: combine(
                timestamp({ format: 'DD-MMM-YYYY h:mm:ss A' }),
                uncolorize(),
                format.errors({ stack: true }),
                createUnifiedFormatter(false)
            ),
        }),
    ],
    exceptionHandlers: [
        new transports.File({ filename: path.join(logDir, 'exceptions.log') }),
    ],
    rejectionHandlers: [
        new transports.File({ filename: path.join(logDir, 'rejections.log') }),
    ],
    exitOnError: false,
});

morgan.token('full-url', (req: Request) => {
    return req.originalUrl || req.url;
});

const morganLogFormat = ':method :full-url';

const morganStream = {
    write: (message: string) => {
        logger.info(message.trim(), { http: true });
    },
};

const morganMiddleware = morgan(morganLogFormat, {
    stream: morganStream,
});

export { logger, morganMiddleware };
export default logger;