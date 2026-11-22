import type { Message } from 'node-telegram-bot-api';
import type winston from 'winston';
import { CHARACTER_NAMES, COMMAND, COMMANDS, CommandTypes, SUMMARIZE_CHUNK_SIZE } from '../constants';
import type { FileDescriberService } from '../services/describer';
import {
    fillTemplate,
    formatUserName,
    type FullMessageModel,
    type HoloAIService,
    type HoloService,
} from '../services/holo';
import type { TriggerService } from '../services/trigger';
import { TRIGGER } from '../services/trigger/constants';
import type { Trigger } from '../services/trigger/types';
import { toLocalTime } from '../utils/datetime';
import { ATTACHMENT_TYPE_NAMES, AUDIO_TYPES, NON_AUDIO_TYPES } from '../utils/db/repositories';
import type { Container } from '../utils/di';
import { CHAT_ACTION, type ChatContext, type TelegramBot } from '../utils/tg';

const ACTION_RESEND_TIMEOUT = 4500; // 4,5s

const chunk = <T>(arr: T[], size: number): T[][] => {
    const result: T[][] = [];

    for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size));
    }

    return result;
};

export class HoloController {
    holoService: HoloService;
    holoAIService: HoloAIService;
    triggerService: TriggerService;
    fileDescriberService: FileDescriberService;
    tg: TelegramBot;
    logger: winston.Logger;

    constructor(container: Container) {
        this.holoService = container.HoloService;
        this.holoAIService = container.HoloAIService;
        this.triggerService = container.TriggerService;
        this.fileDescriberService = container.FileDescriberService;
        this.tg = container.TelegramBot;
        this.logger = container.LoggerFactory.createLogger('Holo');
    }

    async handleTgMessage(ctx: ChatContext) {
        this.logMessage(ctx);

        await Promise.all([this.createMessage(ctx.message), this.createMessage(ctx.message.reply_to_message)]);

        // TODO: need to optimize creation of reply message with reply_to_id field
        const [message, repliedMessage] = await Promise.all([
            this.holoService.getFullMessage(ctx.chatId, ctx.message.message_id),
            this.holoService.getFullMessage(
                ctx.message.reply_to_message?.chat.id,
                ctx.message.reply_to_message?.message_id,
            ),
        ]);

        if (message && repliedMessage) {
            await this.holoService.markAsReply(message.id, repliedMessage.id);
            message.replyToId = repliedMessage.id;
        }

        if (ctx.isEdited || ctx.isOwnBot) return; // don't react to edit messages

        if (!message) return; // skip broken messages

        const trigger = this.matchTrigger(ctx);

        if (!trigger) return; // skip unrelated messages

        void this.processMessage(trigger, message, repliedMessage).catch((err) => this.logger.error(err));
    }

    async processMessage(trigger: Trigger, message: FullMessageModel, repliedMessage: FullMessageModel | null) {
        await this.tg.action(message.chat.tgId, CHAT_ACTION.TYPING, message.threadTgId);
        const typing = setInterval(() => {
            this.tg.action(message.chat.tgId, CHAT_ACTION.TYPING, message.threadTgId);
        }, ACTION_RESEND_TIMEOUT);

        try {
            await this.generateReply(trigger, message, repliedMessage);
        } finally {
            this.tg.action(message.chat.tgId, CHAT_ACTION.TYPING, message.threadTgId);
            clearInterval(typing);
        }
    }

    logMessage(ctx: ChatContext) {
        let template = 'incoming';

        template += ctx.chatId ? ` -c ${ctx.chatId}` : '';
        template += ctx.message.message_id ? ` -m ${ctx.message.message_id}` : '';
        template += ctx.message.message_thread_id ? ` -th ${ctx.message.message_thread_id}` : '';
        template += ctx.message.from?.username ? ` -u "${ctx.message.from?.username}"` : '';

        if (ctx.message.reply_to_message) {
            const reply = ctx.message.reply_to_message;

            template += '. response to ';
            template += reply.chat.id ? ` -c ${reply.chat.id}` : '';
            template += reply.message_id ? ` -m ${reply.message_id}` : '';
            template += reply.message_thread_id ? ` -th ${reply.chat.id}` : '';
            template += reply.from?.username ? ` -u "${reply.from?.username}"` : '';
        }

        this.logger.info(template);
    }

    async createMessage(tgMessage?: Message) {
        if (!tgMessage) return;

        const [user, chat] = await Promise.all([
            this.holoService.upsertTgUser(tgMessage.from),
            this.holoService.upsertTgChat(tgMessage.chat),
        ]);

        if (!user || !chat) return;

        const message = await this.holoService.upsertMessage(tgMessage, {
            chat_id: chat.id,
            user_id: user.id,
        });

        if (!message) return;

        const attachmentOptions = {
            message_id: message.id,
            media_group_id: tgMessage.media_group_id,
            caption: tgMessage.caption?.trim(),
        };

        if (tgMessage.audio) {
            await this.holoService.createAudioAttachment(tgMessage.audio, attachmentOptions);
        }

        if (tgMessage.voice) {
            await this.holoService.createVoiceAttachment(tgMessage.voice, attachmentOptions);
        }

        if (tgMessage.photo && tgMessage.photo.length) {
            const largest = tgMessage.photo.reduce((acc, curr) =>
                (curr.file_size || 0) > (acc.file_size || 0) ? curr : acc,
            );

            await this.holoService.createPhotoAttachment(largest, attachmentOptions);
        }

        if (tgMessage.animation) {
            await this.holoService.createAnimationAttachment(tgMessage.animation, attachmentOptions);
        }

        if (tgMessage.live_photo) {
            await this.holoService.createLivePhotoAttachment(tgMessage.live_photo, attachmentOptions);
        }

        if (tgMessage.sticker) {
            let caption: string | undefined = attachmentOptions.caption;

            if (caption) {
                caption = (caption + ' ' + tgMessage.sticker?.emoji).trim();
            } else {
                caption = tgMessage.sticker?.emoji;
            }

            await this.holoService.createStickerAttachment(tgMessage.sticker, {
                ...attachmentOptions,
                caption,
            });
        }

        if (tgMessage.video) {
            await this.holoService.createVideoAttachment(tgMessage.video, attachmentOptions);
        }

        if (tgMessage.video_note) {
            await this.holoService.createVideoNoteAttachment(tgMessage.video_note, attachmentOptions);
        }
    }

    matchTrigger(ctx: ChatContext): Trigger | undefined {
        const message = ctx.message.text;

        const commandTrigger = this.triggerService.matchCommand(message, this.tg.botName, COMMANDS);

        if (commandTrigger) return commandTrigger;

        if (ctx.isReplyToBot) return { reason: TRIGGER.REPLY };

        const mentionTrigger = this.triggerService.matchMention(message, this.tg.botName);

        if (mentionTrigger) return mentionTrigger;

        const nameTrigger = this.triggerService.matchCharacterName(message, CHARACTER_NAMES);

        if (nameTrigger) return nameTrigger;
    }

    async generateReply(trigger: Trigger, message: FullMessageModel, reply?: FullMessageModel | null) {
        this.logger.info(`gen -m ${message.id} -r ${JSON.stringify(trigger)}`);

        if (trigger.command) {
            switch (trigger.command) {
                case COMMAND.DELETE: {
                    return this.execDeleteCommand(message, reply);
                }
                case COMMAND.SUMMARIZE: {
                    return this.execChatSummaryCommand(message, trigger.args);
                }
                case COMMAND.TRANSCRIBE: {
                    return this.execFileDescribeCommand(COMMAND.TRANSCRIBE, AUDIO_TYPES, message, reply);
                }
                case COMMAND.DESCRIBE: {
                    return this.execFileDescribeCommand(COMMAND.DESCRIBE, NON_AUDIO_TYPES, message, reply);
                }
                case COMMAND.TRANSLATE: {
                    // TODO:
                    return;
                }
            }
        }

        const commands = await this.holoAIService.defineCommand(message.text);

        const overrideAttempt = commands.find((command) => command.category === 'overriding_instructions');

        if (overrideAttempt) {
            const res = await this.holoAIService.rejectOverrideAttempt(message.text);

            return this.tg.sendMessage(res, message.chat.tgId, {
                messageThreadId: message.threadTgId,
                replyToMessageId: message.messageTgId,
            });
        }

        for (const command of commands) {
            switch (command.category) {
                case 'delete': {
                    await this.execDeleteCommand(message, reply);
                    break;
                }
                case 'request': {
                    switch (command.type) {
                        case 'unacceptable': {
                            const res = await this.holoAIService.rejectUnacceptable(message.text);

                            return await this.tg.sendMessage(res, message.chat.tgId, {
                                messageThreadId: message.threadTgId,
                                replyToMessageId: message.messageTgId,
                            });
                        }
                        case COMMAND.SUMMARIZE: {
                            const args = typeof command.args === 'string' ? command.args : undefined;
                            return this.execChatSummaryCommand(message, args);
                        }
                        case COMMAND.TRANSCRIBE: {
                            return this.execFileDescribeCommand(COMMAND.TRANSCRIBE, AUDIO_TYPES, message, reply);
                        }
                        case COMMAND.DESCRIBE: {
                            return this.execFileDescribeCommand(COMMAND.DESCRIBE, NON_AUDIO_TYPES, message, reply);
                        }
                    }
                }
            }
        }

        // TODO: regular interaction (algorithmic & tool-based)
    }

    async execDeleteCommand(message: FullMessageModel, reply?: FullMessageModel | null) {
        if (!reply || reply.user.tgId !== this.tg.botId) {
            const aiRes = await this.holoAIService.failToDeleteReply();

            await this.tg.sendMessage(aiRes, message.chat.tgId, {
                messageThreadId: message.threadTgId,
                replyToMessageId: message.messageTgId,
            });

            return;
        }

        try {
            await this.tg.deleteMessage(reply.chat.tgId, reply.messageTgId);
            await this.holoService.deleteMessage(reply.id);
        } catch (error) {
            this.logger.warn(`Error deleting message; -c ${reply.chat.tgId} -m ${reply.messageTgId}\nError: ${error}`);

            const aiRes = await this.holoAIService.failToDeleteReply(true);

            await this.tg.sendMessage(aiRes, message.chat.tgId, {
                messageThreadId: message.threadTgId,
                replyToMessageId: message.messageTgId,
            });
        }
    }

    private async execFileDescribeCommand(
        task: CommandTypes,
        types: number[],
        message: FullMessageModel,
        reply?: FullMessageModel | null,
    ) {
        const ack = await this.holoAIService.taskAcknowledge(task);

        const tgMessage = await this.tg.sendMessage(ack, message.chat.tgId, {
            messageThreadId: message.threadTgId,
            replyToMessageId: message.messageTgId,
        });

        const attachments = reply?.attachments.filter((file) => types.includes(file.type));

        if (!reply || !attachments?.length) {
            const failRes = await this.holoAIService.taskFail(task);
            await this.tg.editMessage(failRes, tgMessage.chat.id, tgMessage.message_id);
            return;
        }

        const descriptions: string[] = [];
        for (const file of attachments) {
            const described = await this.fileDescriberService.describe(file);
            if (described && described.ai_description) descriptions.push(described.ai_description);
        }

        if (!descriptions.length) {
            const failRes = await this.holoAIService.taskFail(task);
            await this.tg.editMessage(failRes, tgMessage.chat.id, tgMessage.message_id);
        }

        const template = await this.holoAIService.generateTemplateResponse(task);

        const username = formatUserName(message.user);

        let description = descriptions.join('\n\n');
        if (task !== 'transcribe') {
            description = await this.holoAIService.translate(description);
        }

        const res = fillTemplate(template, { username, data: `<blockquote>${description}</blockquote>` });
        await this.tg.editMessage(res, tgMessage.chat.id, tgMessage.message_id, { parseMode: 'HTML' });
    }

    private async execChatSummaryCommand(message: FullMessageModel, args?: string) {
        const chatId = message.chat.tgId;

        this.logger.info(`summarize -c ${chatId} -args ${JSON.stringify(args)}`);

        const ack = await this.holoAIService.taskAcknowledge(COMMAND.SUMMARIZE);

        const tgMessage = await this.tg.sendMessage(ack, chatId, {
            messageThreadId: message.threadTgId,
            replyToMessageId: message.messageTgId,
        });

        const scope = await this.holoAIService.parseSummarizeArgs(args);

        this.logger.info(`summarize -scope ${JSON.stringify(scope)}`);

        let messages: FullMessageModel[];
        if (scope.mode === 'count') {
            messages = await this.holoService.getFullMessages(chatId, scope.count);
        } else {
            messages = await this.holoService.getFullMessagesInDateRange(chatId, scope.from, scope.to);
        }

        if (!messages.length) {
            const res = await this.holoAIService.taskFail(COMMAND.SUMMARIZE);
            await this.tg.editMessage(res, chatId, tgMessage.message_id);
            return;
        }

        const meta = this.holoService.calculateChatSummaryMetadata(messages);

        const estimateRes = await this.holoAIService.summarizeEstimate(meta);
        await this.tg.editMessage(estimateRes, chatId, tgMessage.message_id);

        const transcripts: string[] = [];
        const messagesById = new Map(messages.map((chatMessage) => [chatMessage.id, chatMessage]));
        const attachmentLinesByMessageId = new Map<number, string[]>();

        const getAttachmentLines = async (chatMessage: FullMessageModel) => {
            const cachedLines = attachmentLinesByMessageId.get(chatMessage.id);
            if (cachedLines) return cachedLines;

            const attachmentLines: string[] = [];
            for (const attachment of chatMessage.attachments) {
                const att = await this.fileDescriberService.describe(attachment);

                if (!att) continue;

                const typeName = ATTACHMENT_TYPE_NAMES[att.type] ?? 'attachment';
                let attachmentLine = `[${typeName}]`;

                if (att.performer) attachmentLine += ` performer: ${att.performer.trim()}`;
                if (att.rel.caption?.trim()) attachmentLine += ` caption: ${att.rel.caption.trim()}`;
                if (att.ai_description?.trim()) attachmentLine += `\n${att.ai_description.trim()}`;

                attachmentLines.push(attachmentLine);
            }

            attachmentLinesByMessageId.set(chatMessage.id, attachmentLines);
            return attachmentLines;
        };

        for (const messagesChunk of chunk(messages, SUMMARIZE_CHUNK_SIZE)) {
            const lines: string[] = [];

            for (const message of messagesChunk) {
                const time = toLocalTime(message.sentAt);
                const sender = formatUserName(message.user);
                const text = message.text?.trim() ?? '<empty_message>';
                const repliedMessage = message.replyToId ? messagesById.get(message.replyToId) : undefined;
                let replyContext = '';

                if (repliedMessage) {
                    const repliedText = repliedMessage.text?.trim() ?? '<empty_message>';
                    const repliedAttachments = await getAttachmentLines(repliedMessage);
                    const attachmentContext = repliedAttachments.length
                        ? `; attachments: ${repliedAttachments.join('; ')}`
                        : '';
                    replyContext = `, reply to ${formatUserName(repliedMessage.user)}: ${repliedText}${attachmentContext}`;
                }

                lines.push(`time: ${time}, sender: ${sender}${replyContext}, message: ${text}`);

                const attachments = await getAttachmentLines(message);
                if (attachments.length) lines.push(...attachments);
            }

            const transcript = await this.holoAIService.summarizeMessagesChunk(lines);

            if (transcript) transcripts.push(transcript);
        }

        if (!transcripts.length) {
            const res = await this.holoAIService.taskFail(COMMAND.SUMMARIZE);
            await this.tg.editMessage(res, chatId, tgMessage.message_id);
            return;
        }

        const template = await this.holoAIService.generateTemplateResponse(COMMAND.SUMMARIZE);

        const username = formatUserName(message.user);

        const summary = await this.holoAIService.summarizeTranscripts(transcripts);

        if (!summary) {
            const res = await this.holoAIService.taskFail(COMMAND.SUMMARIZE);
            await this.tg.editMessage(res, chatId, tgMessage.message_id);
            return;
        }

        const res = fillTemplate(template, { username, data: `<blockquote>${summary}</blockquote>` });

        await this.tg.editMessage(res, chatId, tgMessage.message_id, { parseMode: 'HTML' });
    }
}
