import dotenv from 'dotenv';
import http from 'http';
import path from 'path';
import type { CronFactory } from './core/cron';
import type { Database } from './core/db';
import { DIContainerFactory } from './core/di';
import type { LoggerFactory } from './core/logger';
import type { Router } from './core/router';
import type { TelegramBot } from './core/tg';
import { RequestExecutorTask } from './modules/request-executor';
import { TelegramController } from './modules/telegram';
import { TelegramRoutes } from './routes';
import { EVERY_MINUTE } from './shared/constants';

dotenv.config({ path: path.join(process.cwd(), '.env') });

async function bootstrap() {
    const PORT = Number(process.env.PORT) || 3030;

    const routes = [TelegramRoutes];

    const container = DIContainerFactory.createContainer();

    const database = container.resolve<Database>('Database');
    const router = container.resolve<Router>('Router').new(routes);
    const tg = container.resolve<TelegramBot>('TelegramBot');
    const cron = container.resolve<CronFactory>('CronFactory');

    cron.registerTask(RequestExecutorTask, EVERY_MINUTE);

    tg.addHandler(TelegramController);

    const server = http.createServer(router);

    const logger = container.resolve<typeof LoggerFactory>('LoggerFactory').createLogger('App');

    let isShuttingDown = false;
    const gracefulShutdown = async () => {
        if (isShuttingDown) {
            logger.info('Forced exit...');
            process.exit(1);
        }

        isShuttingDown = true;

        logger.info('Graceful shutdown started... (press Ctrl+C again to force)');

        cron.stopAll();
        await tg.stop();
        server.close();
        await database.close();

        setTimeout(() => {
            console.error('Forced shutdown due to timeout');
            process.exit(1);
        }, 10000);

        process.exit(0);
    };

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);

    cron.startAll();
    await tg.start();

    server.listen(PORT, () => {
        logger.info(`Server is started on http://localhost:${PORT}`);
    });
}

bootstrap();
