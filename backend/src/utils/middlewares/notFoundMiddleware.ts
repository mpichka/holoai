import type { NextFunction, Request, Response } from 'express';
import { NotFoundException } from '../exceptions';

export function notFoundMiddleware(_req: Request, _res: Response, next: NextFunction) {
    return next(new NotFoundException('API not found'));
}
