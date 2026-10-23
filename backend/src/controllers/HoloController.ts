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
            await this.holoService.upsertTgUser(ctx.edited?.from);
            await this.holoService.upsertTgUser(ctx.edited?.reply_to_message?.from);
            await this.holoService.upsertTgChat(ctx.edited.chat);
            await this.holoService.upsertTgChat(ctx.edited?.reply_to_message?.chat);

            return;
        }

        if (ctx.new) {
            await this.holoService.upsertTgUser(ctx.new?.from);
            await this.holoService.upsertTgUser(ctx.new?.reply_to_message?.from);
            await this.holoService.upsertTgChat(ctx.new.chat);
            await this.holoService.upsertTgChat(ctx.new?.reply_to_message?.chat);
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
