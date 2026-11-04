import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

import { Database } from '../src/utils/db';
import { type ChatRecord } from '../src/utils/db/repositories/ChatRepository';
import { type UserRecord } from '../src/utils/db/repositories/UserRepository';
import type { Container } from '../src/utils/di';
import { LoggerFactory } from '../src/utils/logger';
import { normalizeChatType, parseTgId } from './utils/archive';
import { ExportChat } from './utils/types';

dotenv.config({ path: path.join('..', '.env') });

const logger = LoggerFactory.createLogger('Scripts:upload_chat_archive');
const container = { LoggerFactory } as Container;
const database = new Database(container);

const userCache = new Map<number, UserRecord>();
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
        await database.knex.transaction(async (t) => {
            // TODO: transaction is probably broken, it still works though...

            const chatRecord: ChatRecord = await chatRepository.upsert(
                {
                    tg_id: data.id,
                    type: normalizeChatType(data.type),
                    title: data.name,
                    is_forum: true,
                    is_direct_messages: false,
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
                            tg_id: parsed.tgId,
                            is_bot: parsed.isBot,
                            first_name: m.from,
                        },
                        t,
                    );

                    userCache.set(parsed.tgId, userRecord);
                    usersCount++;
                }

                const messageRecord = await messageRepository.upsert(
                    {
                        chat_id: chatRecord.id,
                        user_id: userRecord.id,
                        message_tg_id: m.id,
                        thread_tg_id: undefined,
                        reply_to_id: m.reply_to_message_id ? messageCache.get(m.reply_to_message_id) : undefined,
                        sent_at: Number(m.date_unixtime),
                        text: m.text,
                    },
                    t,
                );

                messageCache.set(m.id, messageRecord.id);
                messagesCount++;
            }
        });
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
