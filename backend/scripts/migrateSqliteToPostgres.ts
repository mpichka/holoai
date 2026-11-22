import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
import knexFactory, { type Knex } from 'knex';
import fs from 'node:fs';
import path from 'node:path';
import { Prisma, PrismaClient } from '../src/generated/prisma/client';

type SqliteRow = Record<string, unknown>;
type DestinationTransaction = Prisma.TransactionClient;

type TableCopy = {
    name: string;
    primaryKey: string[];
    count: (tx: DestinationTransaction) => Promise<number>;
    insert: (tx: DestinationTransaction, rows: SqliteRow[]) => Promise<number>;
    resetSequence?: (tx: DestinationTransaction) => Promise<unknown>;
};

function findRepositoryRoot(startDirectory: string): string {
    let directory = path.resolve(startDirectory);

    while (true) {
        if (
            fs.existsSync(path.join(directory, 'pnpm-workspace.yaml')) &&
            fs.existsSync(path.join(directory, 'backend', 'package.json'))
        ) {
            return directory;
        }

        const parentDirectory = path.dirname(directory);
        if (parentDirectory === directory) {
            throw new Error('Could not locate the repository root from the current working directory.');
        }
        directory = parentDirectory;
    }
}

const repositoryRoot = findRepositoryRoot(process.cwd());
dotenv.config({ path: path.join(repositoryRoot, '.env') });

const batchSize = 250;
const tables: TableCopy[] = [
    {
        name: 'users',
        primaryKey: ['id'],
        count: (tx) => tx.user.count(),
        insert: (tx, rows) =>
            tx.user
                .createMany({
                    data: rows.map((row) => ({
                        id: numberValue(row.id),
                        createdAt: numberValue(row.created_at),
                        updatedAt: numberValue(row.updated_at),
                        tgId: BigInt(numberValue(row.tg_id)),
                        isBot: Boolean(row.is_bot),
                        firstName: nullableString(row.first_name),
                        lastName: nullableString(row.last_name),
                        username: nullableString(row.username),
                        languageCode: nullableString(row.language_code),
                        spelledName: nullableString(row.spelled_name),
                        gender: nullableString(row.gender),
                    })),
                })
                .then((result) => result.count),
        resetSequence: (tx) =>
            tx.$queryRaw`SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM "users"`,
    },
    {
        name: 'chats',
        primaryKey: ['id'],
        count: (tx) => tx.chat.count(),
        insert: (tx, rows) =>
            tx.chat
                .createMany({
                    data: rows.map((row) => ({
                        id: numberValue(row.id),
                        createdAt: numberValue(row.created_at),
                        updatedAt: numberValue(row.updated_at),
                        tgId: BigInt(numberValue(row.tg_id)),
                        type: stringValue(row.type),
                        title: nullableString(row.title),
                        firstName: nullableString(row.first_name),
                        lastName: nullableString(row.last_name),
                        username: nullableString(row.username),
                        isForum: Boolean(row.is_forum),
                        isDirectMessages: Boolean(row.is_direct_messages),
                    })),
                })
                .then((result) => result.count),
        resetSequence: (tx) =>
            tx.$queryRaw`SELECT setval(pg_get_serial_sequence('chats', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM "chats"`,
    },
    {
        name: 'attachments',
        primaryKey: ['id'],
        count: (tx) => tx.attachment.count(),
        insert: (tx, rows) =>
            tx.attachment
                .createMany({
                    data: rows.map((row) => ({
                        id: numberValue(row.id),
                        createdAt: numberValue(row.created_at),
                        updatedAt: numberValue(row.updated_at),
                        type: numberValue(row.type),
                        fileTgUid: stringValue(row.file_tg_uid),
                        fileSize: nullableNumber(row.file_size),
                        mimeType: nullableString(row.mime_type),
                        fileName: nullableString(row.file_name),
                        duration: nullableNumber(row.duration),
                        performer: nullableString(row.performer),
                        aiDescription: nullableString(row.ai_description),
                    })),
                })
                .then((result) => result.count),
        resetSequence: (tx) =>
            tx.$queryRaw`SELECT setval(pg_get_serial_sequence('attachments', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM "attachments"`,
    },
    {
        name: 'messages',
        primaryKey: ['id'],
        count: (tx) => tx.message.count(),
        insert: (tx, rows) =>
            tx.message
                .createMany({
                    data: rows.map((row) => ({
                        id: numberValue(row.id),
                        createdAt: numberValue(row.created_at),
                        updatedAt: numberValue(row.updated_at),
                        chatId: numberValue(row.chat_id),
                        userId: numberValue(row.user_id),
                        messageTgId: numberValue(row.message_tg_id),
                        threadTgId: nullableNumber(row.thread_tg_id),
                        replyToId: nullableNumber(row.reply_to_id),
                        sentAt: nullableNumber(row.sent_at),
                        text: nullableString(row.text),
                    })),
                })
                .then((result) => result.count),
        resetSequence: (tx) =>
            tx.$queryRaw`SELECT setval(pg_get_serial_sequence('messages', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM "messages"`,
    },
    {
        name: 'attachments_to_messages',
        primaryKey: ['message_id', 'attachment_id'],
        count: (tx) => tx.attachmentToMessage.count(),
        insert: (tx, rows) =>
            tx.attachmentToMessage
                .createMany({
                    data: rows.map((row) => ({
                        messageId: numberValue(row.message_id),
                        attachmentId: numberValue(row.attachment_id),
                        fileTgId: stringValue(row.file_tg_id),
                        caption: nullableString(row.caption),
                        mediaGroupId: nullableString(row.media_group_id),
                    })),
                })
                .then((result) => result.count),
    },
];

function numberValue(value: unknown): number {
    const number = typeof value === 'number' ? value : Number(value);
    if (!Number.isSafeInteger(number)) throw new Error(`Expected a safe integer, got ${String(value)}`);
    return number;
}

function nullableNumber(value: unknown): number | null {
    return value === null || value === undefined ? null : numberValue(value);
}

function stringValue(value: unknown): string {
    if (typeof value !== 'string') throw new Error(`Expected a string, got ${String(value)}`);
    return value;
}

function nullableString(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    return stringValue(value);
}

function readSourceCount(countRow: { count?: string | number } | undefined, tableName: string): number {
    const count = Number(countRow?.count);
    if (!Number.isSafeInteger(count) || count < 0) {
        throw new Error(`Could not read a valid row count for SQLite table "${tableName}"`);
    }
    return count;
}

async function checkSqliteIntegrity(source: Knex.Transaction): Promise<void> {
    const quickCheck = (await source.raw('PRAGMA quick_check')) as Array<{ quick_check: string }>;
    if (quickCheck.length !== 1 || quickCheck[0]?.quick_check !== 'ok') {
        throw new Error('SQLite PRAGMA quick_check reported a problem; no PostgreSQL data was written.');
    }

    const foreignKeyErrors = (await source.raw('PRAGMA foreign_key_check')) as unknown[];
    if (foreignKeyErrors.length > 0) {
        throw new Error(
            `SQLite PRAGMA foreign_key_check reported ${foreignKeyErrors.length} violation(s); no PostgreSQL data was written.`,
        );
    }
}

async function copyTable(
    source: Knex.Transaction,
    destination: DestinationTransaction,
    table: TableCopy,
    expectedCount: number,
): Promise<void> {
    let cursor: SqliteRow | undefined;
    let copiedCount = 0;

    while (copiedCount < expectedCount) {
        let query = source(table.name).select('*').orderBy(table.primaryKey[0]);
        for (const key of table.primaryKey.slice(1)) query = query.orderBy(key);

        if (cursor) {
            if (table.primaryKey.length === 1) {
                query = query.where(table.primaryKey[0], '>', cursor[table.primaryKey[0]] as number);
            } else {
                const [firstKey, secondKey] = table.primaryKey;
                query = query.where((builder) =>
                    builder
                        .where(firstKey, '>', cursor![firstKey] as number)
                        .orWhere((sameFirstKey) =>
                            sameFirstKey
                                .where(firstKey, cursor![firstKey] as number)
                                .andWhere(secondKey, '>', cursor![secondKey] as number),
                        ),
                );
            }
        }

        const rows = (await query.limit(batchSize)) as SqliteRow[];
        if (rows.length === 0) break;

        const insertedCount = await table.insert(destination, rows);
        if (insertedCount !== rows.length) {
            throw new Error(
                `PostgreSQL inserted ${insertedCount} of ${rows.length} rows from SQLite table "${table.name}".`,
            );
        }

        copiedCount += insertedCount;
        cursor = rows[rows.length - 1];
    }

    if (copiedCount !== expectedCount) {
        throw new Error(
            `Copied ${copiedCount} of ${expectedCount} rows from SQLite table "${table.name}"; PostgreSQL transaction will roll back.`,
        );
    }
}

async function main(): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error('DATABASE_URL is required to connect to the PostgreSQL destination.');

    const parsedDatabaseUrl = new URL(databaseUrl);
    if (!['postgres:', 'postgresql:'].includes(parsedDatabaseUrl.protocol)) {
        throw new Error('DATABASE_URL must use the postgres:// or postgresql:// protocol.');
    }

    const sqliteFilename = path.resolve(
        repositoryRoot,
        process.env.BACKEND_SQLITE_DB_PATH ?? path.join('data', 'database.sqlite3'),
    );
    if (!fs.existsSync(sqliteFilename)) {
        throw new Error(`SQLite source database does not exist: ${sqliteFilename}`);
    }

    const sqlite = knexFactory({
        client: 'sqlite3',
        useNullAsDefault: true,
        connection: {
            filename: sqliteFilename,
        },
        pool: {
            min: 1,
            max: 1,
            afterCreate: (connection: any, callback: any) => {
                // Knex combines configured flags with OPEN_READWRITE | OPEN_CREATE,
                // so OPEN_READONLY cannot be added safely. SQLite query_only blocks
                // all data and schema writes on this dedicated source connection.
                connection.run('PRAGMA query_only = ON', callback);
            },
        },
    });
    const prisma = new PrismaClient({
        adapter: new PrismaPg({ connectionString: databaseUrl }),
    });

    let sourceTransaction: Knex.Transaction | undefined;
    let sourceTransactionOpen = false;

    try {
        sourceTransaction = await sqlite.transaction();
        sourceTransactionOpen = true;
        await checkSqliteIntegrity(sourceTransaction);

        const sourceCounts = new Map<string, number>();
        for (const table of tables) {
            const countRow = await sourceTransaction(table.name).count('* as count').first();
            sourceCounts.set(table.name, readSourceCount(countRow, table.name));
        }

        await prisma.$transaction(
            async (destination) => {
                await destination.$executeRaw`LOCK TABLE "users", "chats", "attachments", "messages", "attachments_to_messages" IN EXCLUSIVE MODE`;

                const destinationCounts = new Map<string, number>();
                for (const table of tables) {
                    destinationCounts.set(table.name, await table.count(destination));
                }

                const populatedTables = [...destinationCounts].filter(([, count]) => count !== 0);
                if (populatedTables.length > 0) {
                    const tableList = populatedTables.map(([name, count]) => `${name} (${count} rows)`).join(', ');
                    throw new Error(
                        `PostgreSQL destination is not empty: ${tableList}. No rows were changed; use an empty destination database.`,
                    );
                }

                for (const table of tables) {
                    await copyTable(sourceTransaction!, destination, table, sourceCounts.get(table.name)!);
                }

                for (const table of tables) {
                    const actualCount = await table.count(destination);
                    const expectedCount = sourceCounts.get(table.name)!;
                    if (actualCount !== expectedCount) {
                        throw new Error(
                            `PostgreSQL table "${table.name}" has ${actualCount} rows after copy; expected ${expectedCount}. Transaction will roll back.`,
                        );
                    }
                    await table.resetSequence?.(destination);
                }

                await sourceTransaction!.commit();
                sourceTransactionOpen = false;
            },
            { maxWait: 10_000, timeout: 10 * 60 * 1000 },
        );

        for (const table of tables) {
            console.info(`${table.name}: copied ${sourceCounts.get(table.name)} rows`);
        }
        console.info('SQLite to PostgreSQL copy completed. SQLite was opened read-only.');
    } finally {
        if (sourceTransactionOpen && sourceTransaction) {
            await sourceTransaction.rollback().catch(() => undefined);
        }
        await Promise.all([sqlite.destroy(), prisma.$disconnect()]);
    }
}

main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`SQLite to PostgreSQL copy failed: ${message}`);
    process.exitCode = 1;
});
