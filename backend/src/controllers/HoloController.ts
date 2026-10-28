import type { Message } from 'node-telegram-bot-api';
import type winston from 'winston';
import { CHARACTER_NAMES, COMMANDS } from '../constants';
import type { HoloAIService } from '../services/holo/HoloAIService';
import type { FullMessageModel, HoloService } from '../services/holo/HoloService';
import type { TriggerService } from '../services/trigger';
import { TRIGGER } from '../services/trigger/constants';
import { Trigger } from '../services/trigger/types';
import type { Container } from '../utils/di';
import { CHAT_ACTION, type ChatContext, type TelegramBot } from '../utils/tg';

const ACTION_RESEND_TIMEOUT = 4500; // 4,5s

export class HoloController {
    holoService: HoloService;
    holoAIService: HoloAIService;
    triggerService: TriggerService;
    tg: TelegramBot;
    logger: winston.Logger;

    constructor(container: Container) {
        this.holoService = container.HoloService;
        this.holoAIService = container.HoloAIService;
        this.triggerService = container.TriggerService;
        this.tg = container.TelegramBot;
        this.logger = container.LoggerFactory.createLogger('Holo');
    }

    async handleTgMessage(ctx: ChatContext) {
        this.logMessage(ctx);

        if (ctx.isOwnBot) return; // don't react to own messages

        await Promise.all([this.createMessage(ctx.message), this.createMessage(ctx.message.reply_to_message)]);

        if (ctx.isEdited) return; // don't react to edit messages

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

        if (!message) return; // skip broken messages

        const trigger = this.matchTrigger(ctx);

        if (!trigger) return; // skip unrelated messages

        await this.tg.action(message.chat.tgId, CHAT_ACTION.TYPING, message.threadTgId);
        const typing = setInterval(() => {
            this.tg.action(message.chat.tgId, CHAT_ACTION.TYPING, message.threadTgId);
        }, ACTION_RESEND_TIMEOUT);

        let reply;
        try {
            reply = await this.generateReply(trigger, message, repliedMessage);
        } finally {
            clearInterval(typing);
        }

        await this.createReply(reply);
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

    async createReply(reply: any) {
        // TODO:
        console.log(`\n\n${JSON.stringify(reply)}\n\n`);
    }

    async generateReply(trigger: Trigger, message: FullMessageModel, reply?: FullMessageModel | null) {
        this.logger.info(`Generating reply for the ${message.id} for reason: ${trigger.reason}`);

        const command = trigger.command ? trigger : await this.holoAIService.defineCommand(message.text);

        console.log(command);

        if (!command) {
            // TODO: generic response

            return;
        }
    }
}
