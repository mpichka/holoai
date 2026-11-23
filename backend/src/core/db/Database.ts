import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
import type { Container } from '../di';

export class Database {
    readonly prisma: PrismaClient<'query' | 'error'>;
    private logger;

    constructor(container: Container) {
        this.logger = container.LoggerFactory.createLogger('Database');

        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) throw new Error('DATABASE_URL is required');

        this.prisma = new PrismaClient({
            adapter: new PrismaPg({ connectionString }),
            log: [
                { emit: 'event', level: 'query' },
                { emit: 'event', level: 'error' },
            ],
        });

        this.prisma.$on('query', (event) => this.logger.log('sql', `${event.query} -- ${event.params}`));
        this.prisma.$on('error', (event) => this.logger.error(`Query failed: ${event.message}`));

        const url = new URL(connectionString);
        this.logger.info(`Using PostgreSQL database ${url.pathname.slice(1)} at ${url.host}`);
    }

    async close(): Promise<void> {
        await this.prisma.$disconnect();
        this.logger.info('Database connection closed');
    }
}
