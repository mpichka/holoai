import * as awilix from 'awilix';
import { Database } from '../db';
import { LoggerFactory } from '../logger';
import { Router } from '../router';

export class DIContainerFactory {
    static createContainer(): awilix.AwilixContainer {
        const container = awilix.createContainer({
            injectionMode: awilix.InjectionMode.PROXY,
        });

        const logger = LoggerFactory.createLogger('DI');

        const originalRegister = container.register;

        // @ts-expect-error logger injection
        container.register = function (dependency: any, registration: any) {
            let dependencies: string[] = [];

            if (typeof dependency === 'string') {
                dependencies = [dependency];
            }
            if (typeof dependency === 'object') {
                dependencies = Object.keys(dependency);
            }

            dependencies.forEach((name) => logger.info(`Dependency has been registered: ${name}`));

            originalRegister(dependency, registration);
        };

        const SINGLETON = { lifetime: awilix.Lifetime.SINGLETON };

        container.register({
            LoggerFactory: awilix.asValue(LoggerFactory),
            Database: awilix.asClass(Database, SINGLETON),
            Router: awilix.asClass(Router, SINGLETON),
        });

        return container;
    }
}
