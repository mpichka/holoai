import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import type winston from 'winston';

function formatRequestParam(param: Record<string, any>) {
    const excludeParams = ['password'];

    const requestParam = Object.assign({}, param);
    excludeParams.forEach((key) => delete requestParam[key]);
    return Object.keys(requestParam).length ? requestParam : undefined;
}

export function requestLoggerMiddleware(logger: winston.Logger) {
    return function (req: Request, res: Response, next: NextFunction) {
        if (req.method.toUpperCase() === 'OPTIONS') return next();

        const start = new Date();

        const request = {
            id: randomUUID(),
            method: req.method,
            params: formatRequestParam(req?.params),
            query: formatRequestParam(req?.query),
            body: formatRequestParam(req?.body),
        };

        logger.log('trace', `>>> ${req.method.toUpperCase()} ` + `${req.url} ${JSON.stringify(request)}`);

        res.on('finish', () => {
            const response = {
                id: request.id,
                duration: `${new Date().getTime() - start.getTime()} ms`,
            };

            logger.log('trace', `<<< ${req.method.toUpperCase()} ` + `${req.url} ${JSON.stringify(response)}`);
        });

        return next();
    };
}
