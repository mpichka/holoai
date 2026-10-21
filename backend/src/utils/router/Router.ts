import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import type { Container } from '../di';
import { corsMiddleware, errorHandlerMiddleware, notFoundMiddleware, requestLoggerMiddleware } from '../middlewares';
import type { Data, Route, RouteMethod, Routes } from './types';

export class Router {
    logger;
    constructor(private readonly container: Container) {
        this.logger = container.LoggerFactory.createLogger('API');
    }

    public new() {
        const app = express();

        app.use(corsMiddleware);
        app.use(express.json());

        app.use(requestLoggerMiddleware(this.logger));

        this.injectRoutes(app, [
            // TODO: add routes gere
        ]);

        app.use(notFoundMiddleware);
        app.use(errorHandlerMiddleware(this.logger));

        return app;
    }

    private injectRoutes(app: Express, routes: any[]) {
        routes.forEach((route) => {
            const routesHandler = new route(this.container);

            for (const route of routesHandler.routes) {
                app[route.method as RouteMethod](
                    `/${routesHandler.basePath}/${route.path}`,
                    this.request.call(this, routesHandler, route),
                );

                this.logger.info(`API loaded: ${route.method.toUpperCase()} /${routesHandler.basePath}/${route.path}`);
            }
        });
    }

    private request(routesHandler: Routes, route: Route) {
        return async (request: Request, response: Response, next: NextFunction) => {
            const data: Data<any, any, any> = {
                params: null,
                query: null,
                body: null,
            };

            try {
                await this.validate(request, route, data);

                const output = await route.handler.call(routesHandler, data);

                response
                    .header('content-type', 'application/json')
                    .status(route.responseStatus || 200)
                    .send(output);
            } catch (error) {
                return next(error);
            }
        };
    }

    private async validate(request: Request, route: Route, out: Data<any, any, any>) {
        if (!route?.schema) return;
        const { params, query, body } = route.schema;

        const [parsedParams, parsedQuery, parsedBody] = await Promise.all([
            params?.parseAsync(request.params),
            query?.parseAsync(request.query),
            body?.parseAsync(request.body),
        ]);

        if (params) out.params = parsedParams;
        if (query) out.query = parsedQuery;
        if (body) out.body = parsedBody;
    }
}
