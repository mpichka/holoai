import type { Chat, User } from 'node-telegram-bot-api';
import type { ChatRepository, UserRepository } from '../utils/db/repositories';
import type { Container } from '../utils/di';

export class HoloService {
    userRepository: UserRepository;
    chatRepository: ChatRepository;

    constructor(container: Container) {
        const db = container.Database;
        this.userRepository = db.userRepository;
        this.chatRepository = db.chatRepository;
    }

    async upsertTgUser(user?: User) {
        if (!user) return;

        await this.userRepository.upsert({
            tgId: user.id,
            is_bot: user.is_bot,
            first_name: user.first_name,
            last_name: user.last_name,
            username: user.username,
            language_code: user.language_code,
        });
    }

    async upsertTgChat(chat?: Chat) {
        if (!chat) return;

        await this.chatRepository.upsert({
            tgId: chat.id,
            type: chat.type,
            title: chat.title,
            first_name: chat.first_name,
            last_name: chat.last_name,
            username: chat.username,
            is_forum: Boolean(chat.is_forum),
            is_direct_messages: Boolean(chat.is_direct_messages),
        });
    }
}
