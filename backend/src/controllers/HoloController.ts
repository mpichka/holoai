import type { TriggerService } from '../services/trigger';
import type { Database } from '../utils/db';
import type { UserRepository } from '../utils/db/repositories';
import type { Container } from '../utils/di';
import type { ChatContext, TelegramBot } from '../utils/tg';

export class HoloController {
    characterNames = ['Holo', 'Холо'];
    triggerService: TriggerService;
    tg: TelegramBot;
    db: Database;

    userRepository: UserRepository;

    constructor(container: Container) {
        this.triggerService = container.TriggerService;
        this.tg = container.TelegramBot;
        this.db = container.Database;

        this.userRepository = this.db.userRepository;
    }

    async handleTgMessage(ctx: ChatContext) {
        if (ctx.isOwnBot) return;

        if (ctx.edited) {
            if (ctx.edited.from) {
                const user = ctx.edited.from;

                await this.userRepository.upsert({
                    tgId: user.id,
                    is_bot: user.is_bot,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    username: user.username,
                    language_code: user.language_code,
                });
            }

            return;
        }

        if (ctx.new) {
            if (ctx.new.from) {
                const user = ctx.new.from;

                await this.userRepository.upsert({
                    tgId: user.id,
                    is_bot: user.is_bot,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    username: user.username,
                    language_code: user.language_code,
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
