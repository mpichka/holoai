import dotenv from 'dotenv';
import http from 'http';
import { HoloController } from './controllers/HoloController';
import { Database } from './utils/db';
import { DIContainerFactory } from './utils/di';
import { LoggerFactory } from './utils/logger';
import { Router } from './utils/router';
import { TelegramBot } from './utils/tg';

dotenv.config({ path: '../.env' });

async function bootstrap() {
    const PORT = Number(process.env.PORT) || 3030;

    const container = DIContainerFactory.createContainer();

    const logger = container.resolve<typeof LoggerFactory>('LoggerFactory').createLogger('App');

    const database = container.resolve<Database>('Database');

    const router = container.resolve<Router>('Router').new();

    const tg = container.resolve<TelegramBot>('TelegramBot');

    const holo = container.resolve<HoloController>('HoloController');

    tg.addHandler(holo.handleTgMessage);

    const server = http.createServer(router);

    let isShuttingDown = false;
    const gracefulShutdown = async () => {
        if (isShuttingDown) {
            logger.info('Forced exit...');
            process.exit(1);
        }

        isShuttingDown = true;

        logger.info('Graceful shutdown started... (press Ctrl+C again to force)');

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

    await tg.start();

    server.listen(PORT, () => {
        logger.info(`Server is started on http://localhost:${PORT}`);
    });
}

bootstrap();
