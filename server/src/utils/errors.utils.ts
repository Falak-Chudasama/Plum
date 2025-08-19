import { Response } from 'express';
import logger from './logger.utils';

export function handleErrorUtil(
    fileLocation: string,
    fnName: string,
    error: unknown,
    context: string = 'UnhandledError',
    statusCode: number = 500,
    logStack: boolean = true
): { statusCode: number; success: boolean; error: string } {
    const metaPrefix = `[${context}] at ${fileLocation} > ${fnName}`;
    let responseMessage = 'Something went wrong';
    let logMessage: string | unknown = 'Unknown error object received';

    if (error instanceof Error) {
        responseMessage = error.message;
        logMessage = logStack ? `${error.message}\n${error.stack}` : error.message;
    } else if (typeof error === 'string') {
        responseMessage = error;
        logMessage = error;
    }

    logger.error(`${metaPrefix} | ${logMessage}`);

    return {
        statusCode,
        success: false,
        error: responseMessage,
    };
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
    const err = handleErrorUtil(
        fileLocation,
        fnName,
        error,
        context,
        statusCode,
        logStack
    );

    res.status(err.statusCode).json({
        success: err.success,
        error: err.error,
    });
}