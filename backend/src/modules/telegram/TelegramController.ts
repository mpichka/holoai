import type { Message } from 'node-telegram-bot-api';
import type winston from 'winston';
import type { Container } from '../../core/di';
import type { ChatContext, MessageHandler, TelegramBot } from '../../core/tg';
import { COMMANDS, TRIGGER, type Trigger } from '../../shared/constants';
import { CHARACTER_NAMES } from './constants';
import { TelegramService } from './TelegramService';
import { TriggerService } from './TriggerService';

export class TelegramController implements MessageHandler {
    telegramService: TelegramService;
    triggerService: TriggerService;
    tg: TelegramBot;
    logger: winston.Logger;

    constructor(container: Container) {
        this.telegramService = new TelegramService(container);
        this.triggerService = new TriggerService();
        this.tg = container.TelegramBot;
        this.logger = container.LoggerFactory.createLogger('Telegram');
    }

    async handle(ctx: ChatContext) {
        this.logMessage(ctx);

        await Promise.all([this.createMessage(ctx.message), this.createMessage(ctx.message.reply_to_message)]);

        // TODO: need to optimize creation of reply message with reply_to_id field
        const [message, repliedMessage] = await Promise.all([
            this.telegramService.getFullMessage(ctx.chatId, ctx.message.message_id),
            this.telegramService.getFullMessage(
                ctx.message.reply_to_message?.chat.id,
                ctx.message.reply_to_message?.message_id,
            ),
        ]);

        if (message && repliedMessage) {
            await this.telegramService.markAsReply(message.id, repliedMessage.id);
            message.replyToId = repliedMessage.id;
        }

        if (ctx.isEdited || ctx.isOwnBot) return; // don't react to edit messages

        if (!message) return; // skip broken messages

        const trigger = this.matchTrigger(ctx);

        if (!trigger) return; // skip unrelated messages

        // Processing is deferred to background workers that consume the requests queue
        const request = await this.telegramService.createRequest(message.id, trigger);

        this.logger.info(`queued -m ${message.id} -req ${request.id} -r ${JSON.stringify(trigger)}`);
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
            this.telegramService.upsertTgUser(tgMessage.from),
            this.telegramService.upsertTgChat(tgMessage.chat),
        ]);

        if (!user || !chat) return;

        const message = await this.telegramService.upsertMessage(tgMessage, {
            chatId: chat.id,
            userId: user.id,
        });

        if (!message) return;

        const attachmentOptions = {
            messageId: message.id,
            mediaGroupId: tgMessage.media_group_id,
            caption: tgMessage.caption?.trim(),
        };

        if (tgMessage.audio) {
            await this.telegramService.createAudioAttachment(tgMessage.audio, attachmentOptions);
        }

        if (tgMessage.voice) {
            await this.telegramService.createVoiceAttachment(tgMessage.voice, attachmentOptions);
        }

        if (tgMessage.photo && tgMessage.photo.length) {
            const largest = tgMessage.photo.reduce((acc, curr) =>
                (curr.file_size || 0) > (acc.file_size || 0) ? curr : acc,
            );

            await this.telegramService.createPhotoAttachment(largest, attachmentOptions);
        }

        if (tgMessage.animation) {
            await this.telegramService.createAnimationAttachment(tgMessage.animation, attachmentOptions);
        }

        if (tgMessage.live_photo) {
            await this.telegramService.createLivePhotoAttachment(tgMessage.live_photo, attachmentOptions);
        }

        if (tgMessage.sticker) {
            let caption: string | undefined = attachmentOptions.caption;

            if (caption) {
                caption = (caption + ' ' + tgMessage.sticker?.emoji).trim();
            } else {
                caption = tgMessage.sticker?.emoji;
            }

            await this.telegramService.createStickerAttachment(tgMessage.sticker, {
                ...attachmentOptions,
                caption,
            });
        }

        if (tgMessage.video) {
            await this.telegramService.createVideoAttachment(tgMessage.video, attachmentOptions);
        }

        if (tgMessage.video_note) {
            await this.telegramService.createVideoNoteAttachment(tgMessage.video_note, attachmentOptions);
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
}
