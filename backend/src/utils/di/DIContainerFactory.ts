import * as awilix from 'awilix';
import { HoloController } from '../../controllers/HoloController';
import { FileDescriberService } from '../../services/describer';
import { TriggerService } from '../../services/trigger';
import { Database } from '../db';
import { FileRepository } from '../db/repositories';
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
        });

        container.register({
            FileRepository: awilix.asClass(FileRepository, SINGLETON),
        });

        container.register({
            FileDescriberService: awilix.asClass(FileDescriberService, SINGLETON),
            TriggerService: awilix.asClass(TriggerService, SINGLETON),
        });

        container.register({
            HoloController: awilix.asClass(HoloController, SINGLETON),
        });

        return container;
    }
}
