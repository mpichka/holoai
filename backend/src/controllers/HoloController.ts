import type { Message } from 'node-telegram-bot-api';
import type winston from 'winston';
import { CHARACTER_NAMES, COMMAND, COMMANDS, CommandTypes } from '../constants';
import type { FileDescriberService } from '../services/describer';
import { fillTemplate, type FullMessageModel, type HoloAIService, type HoloService } from '../services/holo';
import type { TriggerService } from '../services/trigger';
import { TRIGGER } from '../services/trigger/constants';
import type { Trigger } from '../services/trigger/types';
import { AUDIO_TYPES, NON_AUDIO_TYPES } from '../utils/db/repositories';
import type { Container } from '../utils/di';
import { CHAT_ACTION, type ChatContext, type TelegramBot } from '../utils/tg';

const ACTION_RESEND_TIMEOUT = 4500; // 4,5s

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
        let template = 'Incoming message.';

        template += ctx.chatId ? ` chat:${ctx.chatId}` : '';
        template += ctx.message.message_id ? `, message:${ctx.message.message_id}` : '';
        template += ctx.message.message_thread_id ? `, thread:${ctx.message.message_thread_id}` : '';
        template += ctx.message.from?.username ? ` from user "${ctx.message.from?.username}"` : '';

        if (ctx.message.reply_to_message) {
            const reply = ctx.message.reply_to_message;

            template += '. In response to';
            template += reply.chat.id ? ` chat:${reply.chat.id}` : '';
            template += reply.message_id ? ` message:${reply.message_id}` : '';
            template += reply.message_thread_id ? ` thread:${reply.chat.id}` : '';
            template += reply.from?.username ? ` of user "${reply.from?.username}"` : '';
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
        this.logger.info(`Generating reply for the ${message.id} for reason: ${trigger.reason}`);

        if (trigger.command) {
            switch (trigger.command) {
                case COMMAND.DELETE: {
                    return await this.execDeleteCommand(message, reply);
                }
                case COMMAND.SUMMARIZE: {
                    break;
                }
                case COMMAND.TRANSCRIBE: {
                    return this.execFileDescribeCommand(COMMAND.TRANSCRIBE, AUDIO_TYPES, message, reply);
                }
                case COMMAND.DESCRIBE: {
                    return this.execFileDescribeCommand(COMMAND.DESCRIBE, NON_AUDIO_TYPES, message, reply);
                }
                case COMMAND.TRANSLATE: {
                    break;
                }
            }
        } else {
            // const commands = await this.holoAIService.defineCommand(message.text);
        }
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
            this.logger.warn(
                `Couldn't delete the message due error. chatId:${reply.chat.tgId}, messageId:${reply.messageTgId}.\nError: ${error}`,
            );

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

        const descriptions: (string | undefined)[] = [];
        for (const file of attachments) {
            const described = await this.fileDescriberService.describe(file);
            descriptions.push(described?.ai_description);
        }

        const template = await this.holoAIService.generateTemplateResponse(task);

        const { firstName, lastName, userName } = reply.user;
        let username = 'невідомцю';
        if (firstName?.trim()) {
            username = `${firstName} ${lastName || ''}`.trim();
        } else if (userName) {
            username = userName;
        }

        const res = fillTemplate(template, { username, data: descriptions.join('\n\n') });
        await this.tg.editMessage(res, tgMessage.chat.id, tgMessage.message_id);
    }
}
