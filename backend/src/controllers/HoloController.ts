import type { Message } from 'node-telegram-bot-api';
import { CHARACTER_NAMES } from '../constants';
import type { HoloService } from '../services/HoloService';
import type { TriggerService } from '../services/trigger';
import type { Container } from '../utils/di';
import type { ChatContext, TelegramBot } from '../utils/tg';

export class HoloController {
    holoService: HoloService;
    triggerService: TriggerService;
    tg: TelegramBot;

    constructor(container: Container) {
        this.holoService = container.HoloService;
        this.triggerService = container.TriggerService;
        this.tg = container.TelegramBot;
    }

    async handleTgMessage(ctx: ChatContext) {
        console.log(`\n${JSON.stringify(ctx)}\n`); // TODO: debug

        if (ctx.isOwnBot) return;

        await this.logMessage(ctx.message);

        if (ctx.isEdited) return;

        const message = await this.holoService.getFullMessage(ctx.chatId, ctx.message.message_id);

        if (ctx.isReplyToBot) {
            // reply
        }

        const isMentionCall = this.triggerService.matchMention('', this.tg.botName);

        if (isMentionCall) {
            // mention
        }

        const isNameCall = this.triggerService.matchCharacterName('', CHARACTER_NAMES);

        if (isNameCall) {
            // name
        }

        const isCommand = this.triggerService.matchCommand('', this.tg.botName, []);

        if (isCommand) {
            // command
        }
    }

    async logMessage(tgMessage: Message) {
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
}
