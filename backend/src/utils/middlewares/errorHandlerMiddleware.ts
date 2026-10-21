import type { NextFunction, Request, Response } from 'express';
import type winston from 'winston';
import { ZodError } from 'zod';
import { HTTP_STATUS_CODE } from '../../constants/httpStatusCode';
import { BadRequestException, HttpException, InternalServerException } from '../exceptions';

export function errorHandlerMiddleware(logger: winston.Logger) {
    return function errorHandlerMiddleware(err: any, _req: Request, res: Response, next: NextFunction) {
        if (!err) {
            return next();
        }

        if (err instanceof ZodError) {
            err = new BadRequestException('Unexpected zod validation error. Fields: ' + JSON.stringify(err.issues));

            logger.warn(err?.message ?? JSON.stringify(err));
        }

        if (!(err instanceof HttpException)) {
            logger.error(err?.message ?? JSON.stringify(err));
            err = new InternalServerException();
        } else if (
            err.httpStatusCode === HTTP_STATUS_CODE.UNPROCESSABLE ||
            err.httpStatusCode >= HTTP_STATUS_CODE.INTERNAL_ERROR
        ) {
            logger.error(err?.message ?? JSON.stringify(err));
        }

        const error: Record<string, any> = {
            statusCode: err.httpStatusCode ?? HTTP_STATUS_CODE.INTERNAL_ERROR,
            status: err.errorCode,
            message: err.message,
        };

        if (process.env.NODE_ENV === 'development') {
            error.stacktrace = err.stack && err.stack.split('\n');
        }

        res.status(error.statusCode).send(error);
    };
}
