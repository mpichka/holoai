import fs from 'fs';
import knexFactory, { type Knex } from 'knex';
import path from 'path';
import type { Container } from '../di';
import { FileRepository } from './repositories';
import { UserRepository } from './repositories/UserRepository';

export class Database {
    readonly knex: Knex;
    private logger;

    userRepository: UserRepository;
    fileRepository: FileRepository;

    constructor(container: Container) {
        this.logger = container.LoggerFactory.createLogger('Database');

        const filename = process.env.BACKEND_SQLITE_DB_PATH ?? path.join(process.cwd(), 'data', 'database.sqlite3');

        fs.mkdirSync(path.dirname(filename), { recursive: true });

        this.knex = knexFactory({
            client: 'sqlite3',
            useNullAsDefault: true,
            connection: { filename },
            pool: {
                afterCreate: (conn: any, done: any) => {
                    conn.run('PRAGMA foreign_keys = ON', done);
                },
            },
        });

        this.knex.on('query', (query) => {
            this.logger.log('sql', `${query.sql} -- ${JSON.stringify(query.bindings)}`);
        });

        this.knex.on('query-error', (err, query) => {
            this.logger.error(`Query failed: ${query.sql} -- ${err}`);
        });

        this.logger.info(`Using SQLite database at ${filename}`);

        this.userRepository = new UserRepository(this.knex);
        this.fileRepository = new FileRepository(this.knex);
    }

    async migrate(): Promise<void> {
        const [batch, applied] = await this.knex.migrate.latest({
            directory: path.join(process.cwd(), 'migrations'),
        });
        this.logger.info(
            applied.length ? `Applied migration batch ${batch}: ${applied.join(', ')}` : 'No pending migrations',
        );
    }

    async close(): Promise<void> {
        await this.knex.destroy();
        this.logger.info('Database connection closed');
    }
}
