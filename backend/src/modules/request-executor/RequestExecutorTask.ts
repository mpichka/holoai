import type winston from 'winston';
import type { CronTask } from '../../core/cron';
import type { Container } from '../../core/di';
import type { Llama } from '../../core/llama';
import { HoloService } from './HoloService';
import { RequestExecutorService } from './RequestExecutorService';

const BATCH_SIZE = 10;

export class RequestExecutorTask implements CronTask {
    holoService: HoloService;
    requestExecutorService: RequestExecutorService;
    llama: Llama;
    logger: winston.Logger;

    constructor(container: Container) {
        this.holoService = new HoloService(container);
        this.requestExecutorService = new RequestExecutorService(container);
        this.llama = container.Llama;
        this.logger = container.LoggerFactory.createLogger('RequestExecutor');
    }

    async run() {
        const { free, size } = this.llama.stats;

        if (free <= 0) {
            this.logger.debug(`no free llama workers (0/${size}), skipping iteration`);

            return;
        }

        while (true) {
            const requests = await this.requestExecutorService.getPendingRequests(BATCH_SIZE);

            if (!requests.length) return;

            for (const request of requests) {
                const executed = await this.holoService.executeRequest(request);

                if (executed) return;
            }
        }
    }
}
