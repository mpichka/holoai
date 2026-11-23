import type winston from 'winston';
import type { CronTask } from '../utils/cron';
import type { Container } from '../utils/di';

export class RequestExecutor implements CronTask {
    logger: winston.Logger;

    constructor(container: Container) {
        this.logger = container.LoggerFactory.createLogger('RequestExecutor');
    }

    async run() {}
}
