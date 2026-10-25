import { CHARACTER_NAMES } from '../constants';
import { HoloService } from '../services/HoloService';
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
        if (ctx.isOwnBot) return;

        if (ctx.edited) {
            const user = await this.holoService.upsertTgUser(ctx.edited.from);
            const chat = await this.holoService.upsertTgChat(ctx.edited.chat);

            if (user && chat) {
                const message = await this.holoService.upsertMessage(ctx.edited, { chatId: chat.id, userId: user.id });
            }

            return;
        }

        if (ctx.new) {
            const user = await this.holoService.upsertTgUser(ctx.new.from);
            const chat = await this.holoService.upsertTgChat(ctx.new.chat);

            if (user && chat) {
                const message = await this.holoService.upsertMessage(ctx.new, {
                    chatId: chat.id,
                    userId: user.id,
                });
            }
        }

        if (ctx.isReply) {
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
}
