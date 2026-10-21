import type { ZodObject, ZodPipe } from 'zod';

export interface Routes {
    basePath: string;
    routes: Route[];
}

export type RouteMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface Route {
    path: string;
    method: RouteMethod | (string & {});
    responseStatus?: number;
    handler: (data: Data<any, any, any>) => Promise<any>;
    schema?: {
        params?: ZodObject | ZodPipe;
        query?: ZodObject | ZodPipe;
        body?: ZodObject | ZodPipe;
    };
}

export type Data<P = null, Q = null, B = null> = {
    params: P;
    query: Q;
    body: B;
};

export type QueryData<Q = null> = {
    query: Q;
};

export type ParamsData<P = null> = {
    params: P;
};

export type BodyData<B = null> = {
    body: B;
};
