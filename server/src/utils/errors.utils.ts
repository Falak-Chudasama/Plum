import { Response } from 'express';
import logger from './logger.utils';

export function handleErrorUtil(
    fileLocation: string,
    fnName: string,
    error: unknown,
    context: string = 'UnhandledError',
    statusCode: number = 500,
    logStack: boolean = true
): { statusCode: number, success: boolean, error: string } {
    let message = 'Something went wrong';

    const metaPrefix = `[${context}] at ${fileLocation} > ${fnName}`;

    if (error instanceof Error) {
        message = error.message;
        logStack
            ? logger.error(`${metaPrefix} | ${message}\n${error.stack}`)
            : logger.error(`${metaPrefix} | ${message}`);
    } else if (typeof error === 'string') {
        message = error;
        logger.error(`${metaPrefix} | ${message}`);
    } else {
        logger.error(`${metaPrefix} | Unknown error object`);
    }

    return {
        statusCode,
        success: false,
        error: message,
    }
}

export default function handleError(
    fileLocation: string,
    fnName: string,
    res: Response,
    error: unknown,
    context: string = 'UnhandledError',
    statusCode: number = 500,
    logStack: boolean = true
): void {
    const err = handleErrorUtil(fileLocation, fnName, error, context, statusCode, logStack);

    res.status(err.statusCode).json({
        success: err.success,
        error: err.error,
    });
};