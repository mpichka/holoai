import {
    Bot,
    type DeleteMessageResult,
    type EditMessageTextResult,
    type Message,
    type SendChatActionResult,
} from 'node-telegram-bot-api';
import type winston from 'winston';
import type { Container } from '../di';
import { ChatAction, ChatContext, SendOptions } from './types';
import { isReplyToBot, mimeTypeFromPath, threadIdOf } from './utils';

export class TelegramBot {
    private bot: Bot;
    private polling: Promise<void> | null = null;
    logger: winston.Logger;
    token: string;
    botId: number = 0;
    botName: string = process.env.BOT_NAME || '';
    handlers: ((ctx: ChatContext) => Promise<void>)[] = [];

    constructor(container: Container) {
        this.logger = container.LoggerFactory.createLogger('Telegram');

        this.token = process.env.TELEGRAM_API_KEY || '';
        if (!this.token) {
            throw new Error('TELEGRAM_API_KEY is not set');
        }

        this.bot = new Bot(this.token);

        this.bot.catch((err, ctx) => {
            this.logger.error(`Unhandled error while processing update ${ctx.update.update_id}: ${err}`);
        });

        this.bot.use(async (ctx, next) => {
            const chatId = ctx.chatId;

            if (!chatId) return;

            const threadId = threadIdOf(ctx);

            const isOwnBot = ctx.from?.id === this.botId;

            const newMessage = ctx.message ?? ctx.channelPost;
            const editedMessage = ctx.editedMessage ?? ctx.editedChannelPost;
            const message = newMessage || editedMessage;

            if (!message) return next();

            await Promise.all(
                this.handlers.map(
                    async (handler) =>
                        await handler({
                            chatId,
                            threadId,
                            isOwnBot,
                            message,
                            isNew: Boolean(newMessage),
                            isEdited: Boolean(editedMessage),
                            isReplyToBot: isReplyToBot(this.botName, message),
                        }),
                ),
            );

            return next();
        });
    }

    addHandler(handler: (ctx: ChatContext) => Promise<void>): TelegramBot {
        this.handlers.push(handler);
        return this;
    }

    async setName(name: string, languageCode?: string): Promise<void> {
        try {
            await this.bot.api.setMyName({
                name,
                language_code: languageCode,
            });

            this.logger.info(`Set bot name to "${name}"` + (languageCode ? ` for language "${languageCode}"` : ''));
        } catch (err) {
            this.logger.error(`Failed to set bot name to "${name}": ${err}`);
            throw err;
        }
    }

    async sendMessage(text: string, chatId: number, options: SendOptions = {}): Promise<Message> {
        try {
            const sent = await this.bot.api.sendMessage({
                chat_id: chatId,
                text,
                message_thread_id: options.messageThreadId,
                reply_parameters: options.replyToMessageId ? { message_id: options.replyToMessageId } : undefined,
            });

            this.logger.info(`Sent message ${sent.message_id} in chat ${chatId}`);

            return sent;
        } catch (err) {
            this.logger.error(`Failed to send message in chat ${chatId}: ${err}`);
            throw err;
        }
    }

    async editMessage(text: string, messageId: number, chatId: number): Promise<EditMessageTextResult> {
        try {
            const edited = await this.bot.api.editMessageText({
                chat_id: chatId,
                message_id: messageId,
                text,
            });

            this.logger.info(`Edited message ${messageId} in chat ${chatId}`);

            return edited;
        } catch (err) {
            this.logger.error(`Failed to edit message ${messageId} in chat ${chatId}: ${err}`);
            throw err;
        }
    }

    async deleteMessage(chatId: number, messageId: number): Promise<DeleteMessageResult> {
        try {
            const deleted = await this.bot.api.deleteMessage({
                chat_id: chatId,
                message_id: messageId,
            });

            this.logger.info(`Deleted message ${messageId} in chat ${chatId}`);

            return deleted;
        } catch (err) {
            this.logger.error(`Failed to delete message ${messageId} in chat ${chatId}: ${err}`);
            throw err;
        }
    }

    async action(
        chatId: number,
        action: ChatAction,
        options: Pick<SendOptions, 'messageThreadId'> = {},
    ): Promise<SendChatActionResult> {
        try {
            const res = await this.bot.api.sendChatAction({
                chat_id: chatId,
                action,
                message_thread_id: options.messageThreadId,
            });

            return res;
        } catch (err) {
            this.logger.error(`Failed to send chat action "${action}" to chat ${chatId}: ${err}`);
            throw err;
        }
    }

    async getFileContent(telegramFileId: string): Promise<{ data: Buffer; mimeType: string | null }> {
        try {
            const file = await this.bot.api.getFile({
                file_id: telegramFileId,
            });

            if (!file.file_path) {
                throw new Error(`Telegram returned no file_path for ${telegramFileId}`);
            }

            const url = `https://api.telegram.org/file/bot${this.token}/${file.file_path}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Telegram file download responded with ${response.status} ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const data = Buffer.from(arrayBuffer);
            const mimeType = mimeTypeFromPath(file.file_path) ?? response.headers.get('content-type');

            return { data, mimeType };
        } catch (err) {
            this.logger.error(`Failed to download file ${telegramFileId}: ${err}`);
            throw err;
        }
    }

    async start() {
        if (this.bot.isRunning()) return this;

        try {
            const me = await this.bot.api.getMe();
            const botName = me.username;

            if (!botName) {
                throw new Error('Cannot set bot name');
            }

            this.botName = botName;
            this.botId = me.id;
        } catch (err) {
            this.logger.error(`Failed to fetch bot info: ${err}`);
        }

        this.logger.info('Bot started (long polling)');

        this.polling = this.bot.startPolling().catch((err) => {
            this.logger.error(`Polling stopped: ${err}`);
        });

        return this;
    }

    async stop(): Promise<void> {
        if (!this.bot.isRunning()) return;

        this.bot.stop();

        await this.polling;
        this.polling = null;

        this.logger.info('Bot stopped');
    }
}
