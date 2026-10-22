import { TriggerService } from '../services/trigger';
import type { Container } from '../utils/di';
import type { ChatContext, TelegramBot } from '../utils/tg';

export class HoloController {
    characterNames = ['Holo', 'Холо'];
    triggerService: TriggerService;
    tg: TelegramBot;
    constructor(container: Container) {
        this.triggerService = container.TriggerService;
        this.tg = container.TelegramBot;
    }

    async handleTgMessage(ctx: ChatContext) {
        if (ctx.isOwnBot) return;

        if (ctx.edited) {
            // update message
            return;
        }

        if (ctx.new) {
            // save message before continuing
        }

        if (ctx.isReply) {
            // reply
        }

        const isMentionCall = this.triggerService.matchMention('', this.tg.botName);

        if (isMentionCall) {
            // mention
        }

        const isNameCall = this.triggerService.matchCharacterName('', this.characterNames);

        if (isNameCall) {
            // name
        }

        const isCommand = this.triggerService.matchCommand('', this.tg.botName, []);

        if (isCommand) {
            // command
        }
    }
}
