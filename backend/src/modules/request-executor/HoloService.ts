import type { Message } from 'node-telegram-bot-api';
import type winston from 'winston';
import type { Container } from '../../core/di';
import type { Llama } from '../../core/llama';
import type { SendOptions, TelegramBot } from '../../core/tg';
import { COMMAND, type CommandTypes, type Trigger, type TriggerReason } from '../../shared/constants';
import type { FileDescriberService } from '../../shared/describer';
import type { FullMessageModel, RequestModel } from '../../shared/database';
import {
    ATTACHMENT_TYPE_NAMES,
    AUDIO_TYPES,
    IMAGE_TYPES,
    NON_AUDIO_TYPES,
    VIDEO_TYPES,
} from '../../shared/database/repositories';
import { nowEpoch, toLocalTime } from '../../shared/utils/datetime';
import { AIService } from './AIService';
import {
    AUDIO_PROCESS_MULTIPLIER,
    IMAGE_PROCESS_MULTIPLIER,
    MESSAGE_PROCESS_MULTIPLIER,
    SUMMARIZE_CHUNK_SIZE,
    VIDEO_PROCESS_MULTIPLIER,
} from './constants';
import { RequestExecutorService } from './RequestExecutorService';
import type { ChatSummaryMetadata, TranscriptAttachment, TranscriptMessage, TranscriptReply } from './types';
import { chunk, fillTemplate, formatGender, formatUserName, splitIntoMessageFragments } from './utils';

export type HoloAction = () => Promise<unknown>;

export class HoloService {
    requestExecutorService: RequestExecutorService;
    ai: AIService;
    fileDescriberService: FileDescriberService;
    tg: TelegramBot;
    llama: Llama;
    logger: winston.Logger;

    constructor(container: Container) {
        this.requestExecutorService = new RequestExecutorService(container);
        this.ai = new AIService(container);
        this.fileDescriberService = container.FileDescriberService;
        this.tg = container.TelegramBot;
        this.llama = container.Llama;
        this.logger = container.LoggerFactory.createLogger('Holo');
    }

    /**
     * Categorizes a queued request and executes it when it is actionable.
     * Returns true when an action was executed (successfully or not).
     * Non-actionable requests are marked as "skipped", broken ones as "failed".
     */
    async executeRequest(request: RequestModel): Promise<boolean> {
        const trigger: Trigger = {
            reason: request.triggerReason as TriggerReason,
            command: request.triggerCommand,
            args: request.triggerArgs,
        };
        let executed = false;

        try {
            const message = await this.requestExecutorService.getFullMessageById(request.messageId);

            if (!message) {
                this.logger.warn(`message not found -req ${request.id} -m ${request.messageId}`);
                await this.requestExecutorService.updateRequest(request.id, {
                    status: 'skipped',
                    finishedAt: nowEpoch(),
                });

                return false;
            }

            const reply = await this.requestExecutorService.getFullMessageById(message.replyToId);

            this.logger.info(`categorize -req ${request.id} -m ${message.id} -r ${JSON.stringify(trigger)}`);

            const action = await this.categorize(trigger, message, reply);

            if (!action) {
                this.logger.info(`skipped -req ${request.id}`);
                await this.requestExecutorService.updateRequest(request.id, {
                    status: 'skipped',
                    finishedAt: nowEpoch(),
                });

                return false;
            }

            executed = true;

            await this.requestExecutorService.updateRequest(request.id, {
                status: 'processing',
                startedAt: nowEpoch(),
            });
            await action();
            await this.requestExecutorService.updateRequest(request.id, { status: 'done', finishedAt: nowEpoch() });

            this.logger.info(`done -req ${request.id}`);
        } catch (error) {
            this.logger.error(`request failed -req ${request.id}: ${error instanceof Error ? error.stack : error}`);
            await this.requestExecutorService.updateRequest(request.id, {
                status: 'failed',
                error: String(error),
                finishedAt: nowEpoch(),
            });
        }

        return executed;
    }

    /** Resolves the action for a message: explicit command first, AI classification otherwise. */
    async categorize(
        trigger: Trigger,
        message: FullMessageModel,
        reply?: FullMessageModel | null,
    ): Promise<HoloAction | null> {
        const commandAction = this.matchCommandAction(trigger.command, trigger.args, message, reply);

        if (commandAction) return commandAction;

        const commands = await this.ai.defineCommand(message, reply);
        const overrideAttempt = commands.find((command) => command.category === 'overriding_instructions');

        if (overrideAttempt) return () => this.execRejectOverride(message);

        for (const command of commands) {
            const args = typeof command.args === 'string' ? command.args : undefined;

            if (command.category === 'delete') return () => this.execDeleteCommand(message, reply);

            if (command.category !== 'request') continue;

            if (command.type === 'unacceptable') return () => this.execRejectUnacceptable(message);

            const action = this.matchCommandAction(command.type, args, message, reply);

            if (action) return action;
        }

        // TODO: regular interaction (algorithmic & tool-based)
        return null;
    }

    private matchCommandAction(
        command: string | undefined,
        args: string | undefined,
        message: FullMessageModel,
        reply?: FullMessageModel | null,
    ): HoloAction | null {
        switch (command) {
            case COMMAND.DELETE:
                return () => this.execDeleteCommand(message, reply);
            case COMMAND.SUMMARIZE:
                return () => this.execChatSummaryCommand(message, args);
            case COMMAND.TRANSCRIBE:
                return () => this.execFileDescribeCommand(COMMAND.TRANSCRIBE, AUDIO_TYPES, message, reply);
            case COMMAND.DESCRIBE:
                return () => this.execFileDescribeCommand(COMMAND.DESCRIBE, NON_AUDIO_TYPES, message, reply);
            case COMMAND.TRANSLATE:
                return () => this.execTranslateCommand(message, reply, args);
            default:
                return null;
        }
    }

    /** Sends a message and stores it in the database. */
    private async sendMessage(text: string, chatId: number, options: SendOptions = {}): Promise<Message> {
        const sent = await this.tg.sendMessage(text, chatId, options);

        await this.requestExecutorService.saveSentMessage(sent, options.replyToMessageId);

        return sent;
    }

    /** Edits a message and keeps the stored text in sync. */
    private async editMessage(text: string, chatId: number, messageId: number, options: SendOptions = {}) {
        const edited = await this.tg.editMessage(text, chatId, messageId, options);

        await this.requestExecutorService.updateMessageText(chatId, messageId, text);

        return edited;
    }

    /** Deletes a message from the chat and from the database. */
    private async deleteMessage(chatId: number, messageId: number) {
        const [deleted] = await Promise.all([
            this.tg.deleteMessage(chatId, messageId),
            this.requestExecutorService.deleteMessageByTelegramId(chatId, messageId),
        ]);

        return deleted;
    }

    private async replyTo(message: FullMessageModel, text: string) {
        return this.sendMessage(text, message.chat.tgId, {
            messageThreadId: message.threadTgId,
            replyToMessageId: message.messageTgId,
        });
    }

    private async execRejectOverride(message: FullMessageModel) {
        const res = await this.ai.rejectOverrideAttempt(message.text);

        return this.replyTo(message, res);
    }

    private async execRejectUnacceptable(message: FullMessageModel) {
        const res = await this.ai.rejectUnacceptable(message.text);

        return this.replyTo(message, res);
    }

    private async execDeleteCommand(message: FullMessageModel, reply?: FullMessageModel | null) {
        if (!reply || reply.user.tgId !== this.tg.botId) {
            const aiRes = await this.ai.failToDeleteReply();

            await this.replyTo(message, aiRes);

            return;
        }

        try {
            await this.deleteMessage(reply.chat.tgId, reply.messageTgId);
        } catch (error) {
            this.logger.warn(`Error deleting message; -c ${reply.chat.tgId} -m ${reply.messageTgId}\nError: ${error}`);

            const aiRes = await this.ai.failToDeleteReply(true);

            await this.replyTo(message, aiRes);
        }
    }

    private async execFileDescribeCommand(
        task: CommandTypes,
        types: number[],
        message: FullMessageModel,
        reply?: FullMessageModel | null,
    ) {
        const attachments = reply?.attachments.filter((file) => types.includes(file.type));
        const username = formatUserName(message.user);
        const ack = await this.ai.taskAcknowledge(task);
        const tgMessage = await this.replyTo(message, ack);

        if (!attachments?.length) {
            const failRes = await this.ai.taskFail(task);

            await this.editMessage(failRes, tgMessage.chat.id, tgMessage.message_id);

            return;
        }

        const described = await this.fileDescriberService.describe(attachments);

        const descriptions = described.reduce<string[]>((acc, file) => {
            if (file?.aiDescription) acc.push(file.aiDescription);

            return acc;
        }, []);

        if (!descriptions.length) {
            const failRes = await this.ai.taskFail(task);

            await this.editMessage(failRes, tgMessage.chat.id, tgMessage.message_id);

            return;
        }

        const template = await this.ai.generateTemplateResponse(task);
        let description = descriptions.join('\n\n');

        if (task !== COMMAND.TRANSCRIBE) {
            description = await this.ai.translateDescription(description);
        }

        const res = fillTemplate(template, { username, data: `<blockquote>${description}</blockquote>` });

        await this.editMessage(res, tgMessage.chat.id, tgMessage.message_id, { parseMode: 'HTML' });
    }

    private async execTranslateCommand(message: FullMessageModel, reply?: FullMessageModel | null, args?: string) {
        const text = reply?.text?.trim();
        let targetLanguage = args;

        if (!targetLanguage) {
            targetLanguage = await this.ai.parseTranslateArgs(args);
        }

        if (!text) {
            const failRes = await this.ai.taskFail(COMMAND.TRANSLATE);

            await this.replyTo(message, failRes);

            return;
        }

        const translated = await this.ai.translate(text, targetLanguage?.trim() || 'Ukrainian');

        await this.sendMessage(`<blockquote>${translated}</blockquote>`, message.chat.tgId, {
            messageThreadId: message.threadTgId,
            replyToMessageId: message.messageTgId,
            parseMode: 'HTML',
        });
    }

    private async execChatSummaryCommand(message: FullMessageModel, args?: string) {
        const chatId = message.chat.tgId;
        const threadId = message.threadTgId || null;
        let messages: FullMessageModel[];

        this.logger.info(`summarize -c ${chatId} -th ${threadId || 'NULL'} -args ${JSON.stringify(args)}`);

        const ack = await this.ai.taskAcknowledge(COMMAND.SUMMARIZE);
        const tgMessage = await this.replyTo(message, ack);
        const scope = await this.ai.parseSummarizeArgs(args);

        if (scope.mode === 'range') {
            const from = new Date(scope.from * 1000).toISOString();
            const to = new Date(scope.to * 1000).toISOString();

            this.logger.info(`summarize -scope ${JSON.stringify({ ...scope, from, to })}`);

            messages = await this.requestExecutorService.getFullMessagesInDateRange(
                chatId,
                scope.from,
                scope.to,
                threadId,
            );
        } else {
            this.logger.info(`summarize -scope ${JSON.stringify(scope)}`);

            messages = await this.requestExecutorService.getFullMessages(chatId, scope.count, threadId);
        }

        if (!messages.length) {
            await this.failSummary(chatId, tgMessage.message_id);

            return;
        }

        const meta = this.calculateChatSummaryMetadata(messages);
        const estimateRes = await this.ai.summarizeEstimate(meta);

        await this.editMessage(estimateRes, chatId, tgMessage.message_id);

        const transcripts = await this.transcribeChat(messages);

        if (!transcripts.length) {
            await this.failSummary(chatId, tgMessage.message_id);

            return;
        }

        const summary = await this.ai.summarizeTranscripts(transcripts);

        if (!summary) {
            await this.failSummary(chatId, tgMessage.message_id);

            return;
        }

        const [first, ...rest] = splitIntoMessageFragments(summary).map(
            (fragment) => `<blockquote>${fragment}</blockquote>`,
        );

        await this.deleteMessage(chatId, tgMessage.message_id);

        await this.sendMessage(first, chatId, {
            messageThreadId: message.threadTgId,
            replyToMessageId: message.messageTgId,
            parseMode: 'HTML',
        });

        for (const fragment of rest) {
            await this.sendMessage(fragment, chatId, {
                messageThreadId: message.threadTgId,
                parseMode: 'HTML',
            });
        }
    }

    private async failSummary(chatId: number, messageId: number) {
        const res = await this.ai.taskFail(COMMAND.SUMMARIZE);

        await this.editMessage(res, chatId, messageId);
    }

    private calculateChatSummaryMetadata(messages: FullMessageModel[]): ChatSummaryMetadata {
        const attachments = messages.flatMap((message) => message.attachments);
        let images = 0;
        let audioDuration = 0;
        let videoDuration = 0;

        for (const attachment of attachments) {
            if (IMAGE_TYPES.includes(attachment.type)) {
                images++;
            } else if (AUDIO_TYPES.includes(attachment.type)) {
                audioDuration += attachment.duration || 0;
            } else if (VIDEO_TYPES.includes(attachment.type)) {
                videoDuration += attachment.duration || 0;
            }
        }

        const estimate =
            (messages.length / 100) * MESSAGE_PROCESS_MULTIPLIER +
            images * IMAGE_PROCESS_MULTIPLIER +
            audioDuration * AUDIO_PROCESS_MULTIPLIER +
            videoDuration * VIDEO_PROCESS_MULTIPLIER;

        return { messagesCount: messages.length, estimate };
    }

    /**
     * Converts chat messages into per-chunk AI transcripts.
     * All attachments are described in one parallel batch first, then chunks are summarized in parallel;
     * both phases follow the Llama pool load. Transcripts keep the chronological chunk order.
     */
    private async transcribeChat(messages: FullMessageModel[]): Promise<string[]> {
        const messagesById = new Map(messages.map((chatMessage) => [chatMessage.id, chatMessage]));
        const attachmentsByMessageId = await this.describeChatAttachments(messages);
        const chunksTranscripts = chunk(messages, SUMMARIZE_CHUNK_SIZE).map((messagesChunk) =>
            this.buildChunkTranscript(messagesChunk, messagesById, attachmentsByMessageId),
        );
        const transcripts = await this.llama.runConcurrently(chunksTranscripts, (chunkTranscript) =>
            this.ai.summarizeMessagesChunk(chunkTranscript),
        );

        return transcripts.filter((transcript): transcript is string => !!transcript);
    }

    /** Describes every attachment of the chat in one parallel batch and groups them per message. */
    private async describeChatAttachments(messages: FullMessageModel[]): Promise<Map<number, TranscriptAttachment[]>> {
        const attachments = messages.flatMap((chatMessage) => chatMessage.attachments);
        const described = await this.fileDescriberService.describe(attachments);
        const attachmentsByMessageId = new Map<number, TranscriptAttachment[]>();
        let offset = 0;

        for (const chatMessage of messages) {
            const count = chatMessage.attachments.length;
            const messageAttachments: TranscriptAttachment[] = [];

            for (const att of described.slice(offset, offset + count)) {
                if (!att) continue;

                const performer = att.performer?.trim();
                const caption = att.rel.caption?.trim();
                const description = att.aiDescription?.trim();
                const attachment: TranscriptAttachment = { type: ATTACHMENT_TYPE_NAMES[att.type] ?? 'attachment' };

                if (performer) attachment.performer = performer;

                if (caption) attachment.caption = caption;

                if (description) attachment.description = description;

                messageAttachments.push(attachment);
            }

            attachmentsByMessageId.set(chatMessage.id, messageAttachments);
            offset += count;
        }

        return attachmentsByMessageId;
    }

    /** Builds the structured transcript of a single chunk of messages. */
    private buildChunkTranscript(
        messagesChunk: FullMessageModel[],
        messagesById: Map<number, FullMessageModel>,
        attachmentsByMessageId: Map<number, TranscriptAttachment[]>,
    ): TranscriptMessage[] {
        const transcript: TranscriptMessage[] = [];

        for (const chatMessage of messagesChunk) {
            const attachments = attachmentsByMessageId.get(chatMessage.id) ?? [];
            const transcriptMessage: TranscriptMessage = {
                messageId: chatMessage.id,
                userId: chatMessage.userId,
                sender: formatUserName(chatMessage.user),
                gender: formatGender(chatMessage.user),
                time: toLocalTime(chatMessage.sentAt),
                text: chatMessage.text?.trim() || null,
            };

            if (chatMessage.replyToId) {
                transcriptMessage.replyTo = this.buildTranscriptReply(
                    chatMessage.replyToId,
                    messagesById,
                    attachmentsByMessageId,
                );
            }

            if (attachments.length) transcriptMessage.attachments = attachments;

            transcript.push(transcriptMessage);
        }

        return transcript;
    }

    /** Builds the reply context of a transcript message; details are known only for messages in the loaded window. */
    private buildTranscriptReply(
        replyToId: number,
        messagesById: Map<number, FullMessageModel>,
        attachmentsByMessageId: Map<number, TranscriptAttachment[]>,
    ): TranscriptReply {
        const repliedMessage = messagesById.get(replyToId);
        const reply: TranscriptReply = { messageId: replyToId };

        if (!repliedMessage) return reply;

        const repliedAttachments = attachmentsByMessageId.get(repliedMessage.id) ?? [];

        reply.userId = repliedMessage.userId;
        reply.sender = formatUserName(repliedMessage.user);
        reply.text = repliedMessage.text?.trim() || null;

        if (repliedAttachments.length) reply.attachments = repliedAttachments;

        return reply;
    }
}
