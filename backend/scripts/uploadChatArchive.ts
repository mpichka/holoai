import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

import type { User } from '../src/generated/prisma/client';
import { Database } from '../src/utils/db';
import type { Container } from '../src/utils/di';
import { LoggerFactory } from '../src/utils/logger';
import { normalizeChatType, parseTgId } from './utils/archive';
import { ExportChat } from './utils/types';

dotenv.config({ path: path.join('..', '.env') });

const logger = LoggerFactory.createLogger('Scripts:upload_chat_archive');
const container = { LoggerFactory } as Container;
const database = new Database(container);

const userCache = new Map<number, User>();
const messageCache = new Map<number, number>();

async function script() {
    const inputPath = process.argv[2];

    if (!inputPath) {
        logger.error('Path to the archive must be provided');
        process.exit(1);
    }

    if (!fs.existsSync(inputPath)) {
        logger.error(`Input file not found: ${inputPath}`);
        process.exit(1);
    }

    const start = Date.now();

    logger.info(`Reading ${inputPath}`);
    const raw = fs.readFileSync(inputPath, 'utf-8');
    const data: ExportChat = JSON.parse(raw);

    logger.info(`Uploading chat: "${data.name}" (${data.type}, id=${data.id})`);
    logger.info(`Total messages in export: ${data.messages.length}`);

    let messagesCount = 0;
    let usersCount = 0;

    const chatRepository = database.chatRepository;
    const userRepository = database.userRepository;
    const messageRepository = database.messageRepository;

    try {
        await database.prisma.$transaction(
            async (t) => {
                const chatRecord = await chatRepository.upsert(
                    {
                        tgId: data.id,
                        type: normalizeChatType(data.type),
                        title: data.name,
                        isForum: true,
                        isDirectMessages: false,
                    },
                    t,
                );

                for (const m of data.messages) {
                    if (m.type === 'service') continue;
                    if (!m.from_id) continue;

                    const parsed = parseTgId(m.from_id);
                    if (!parsed) continue;

                    let userRecord = userCache.get(parsed.tgId);

                    if (!userRecord) {
                        userRecord = await userRepository.upsert(
                            {
                                tgId: parsed.tgId,
                                isBot: parsed.isBot,
                                firstName: m.from,
                            },
                            t,
                        );

                        userCache.set(parsed.tgId, userRecord);
                        usersCount++;
                    }

                    const messageRecord = await messageRepository.upsert(
                        {
                            chatId: chatRecord.id,
                            userId: userRecord.id,
                            messageTgId: m.id,
                            threadTgId: undefined,
                            replyToId: m.reply_to_message_id ? messageCache.get(m.reply_to_message_id) : undefined,
                            sentAt: Number(m.date_unixtime),
                            text: m.text,
                        },
                        t,
                    );

                    messageCache.set(m.id, messageRecord.id);
                    messagesCount++;
                }
            },
            // Default interactive transaction timeout (5s) is too short for large archives
            { maxWait: 10_000, timeout: 10 * 60 * 1000 },
        );
    } catch (error) {
        logger.error('Migration failed:', error);
        await database.close();
        process.exit(1);
    }

    await database.close();

    logger.info(
        `Done in ${Math.round((Date.now() - start) / 100) / 10}s, Users upserted: ${usersCount}, Messages upserted: ${messagesCount}`,
    );
}

script();
