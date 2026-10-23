import type { Message } from 'node-telegram-bot-api';
import type { UserRepository } from '../utils/db/repositories';
import type { Container } from '../utils/di';

export class HoloService {
    userRepository: UserRepository;

    constructor(container: Container) {
        const db = container.Database;
        this.userRepository = db.userRepository;
    }

    async upsertTgUser(message?: Message) {
        if (!message || !message.from) return;

        const user = message.from;

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
