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
        // console.log(`\n${JSON.stringify(ctx)}\n`); // TODO: debug

        if (ctx.isOwnBot) return;

        await this.logMessage(ctx);

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

    async logMessage(ctx: ChatContext) {
        const [user, chat] = await Promise.all([
            this.holoService.upsertTgUser(ctx.message.from),
            this.holoService.upsertTgChat(ctx.message.chat),
        ]);

        if (!user || !chat) return;

        const message = await this.holoService.upsertMessage(ctx.message, {
            chat_id: chat.id,
            user_id: user.id,
        });
    }
}
