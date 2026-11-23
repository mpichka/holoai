import * as awilix from 'awilix';
import { DatabaseService } from '../../shared/database';
import { FileDescriberService } from '../../shared/describer';
import { CronFactory } from '../cron';
import { Database } from '../db';
import { Llama } from '../llama';
import { LoggerFactory } from '../logger';
import { Router } from '../router';
import { TelegramBot } from '../tg';

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
            Llama: awilix.asClass(Llama, SINGLETON),
            TelegramBot: awilix.asClass(TelegramBot, SINGLETON),
            CronFactory: awilix.asClass(CronFactory, SINGLETON),
        });

        container.register({
            DatabaseService: awilix.asClass(DatabaseService, SINGLETON),
            FileDescriberService: awilix.asClass(FileDescriberService, SINGLETON),
        });

        return container;
    }
}
