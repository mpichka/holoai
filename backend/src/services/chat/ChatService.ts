import type { Message } from 'node-telegram-bot-api';
import type {
    AttachmentRepository,
    AttachmentToMessageRepository,
    ChatRepository,
    MessageRepository,
    UserRecord,
    UserRepository,
} from '../../utils/db/repositories';
import type { Container } from '../../utils/di';
import { TelegramBot } from '../../utils/tg';
import type { ChatAction } from '../../utils/tg/constants';
import type { SendOptions } from '../../utils/tg/types';

export class ChatService {
    tg: TelegramBot;
    userRepository: UserRepository;
    chatRepository: ChatRepository;
    messageRepository: MessageRepository;
    attachmentRepository: AttachmentRepository;
    attachmentToMessageRepository: AttachmentToMessageRepository;

    constructor(container: Container) {
        const db = container.Database;
        this.userRepository = db.userRepository;
        this.chatRepository = db.chatRepository;
        this.messageRepository = db.messageRepository;
        this.attachmentRepository = db.attachmentRepository;
        this.attachmentToMessageRepository = db.attachmentToMessageRepository;
        this.tg = container.TelegramBot;
    }

    action(chatId: number, action: ChatAction, threadId?: number) {
        return this.tg.action(chatId, action, threadId);
    }

    async sendMessage(text: string, chatId: number, options: SendOptions = {}): Promise<Message> {
        const sent = await this.tg.sendMessage(text, chatId, options);

        let user: UserRecord | null = null;
        if (sent.from) {
            user = await this.userRepository.upsert({
                tg_id: sent.from.id,
                is_bot: sent.from.is_bot,
                first_name: sent.from.first_name,
                last_name: sent.from.last_name,
                username: sent.from.username,
                language_code: sent.from.language_code,
            });
        }

        const chat = await this.chatRepository.upsert({
            tg_id: sent.chat.id,
            type: sent.chat.type,
            title: sent.chat.title,
            first_name: sent.chat.first_name,
            last_name: sent.chat.last_name,
            username: sent.chat.username,
            is_forum: Boolean(sent.chat.is_forum),
            is_direct_messages: Boolean(sent.chat.is_direct_messages),
        });

        let replyToId: number | undefined;
        if (options.replyToMessageId) {
            replyToId = await this.messageRepository.getIdByTelegramId(chatId, options.replyToMessageId);
        }

        if (user) {
            await this.messageRepository.upsert({
                chat_id: chat.id,
                user_id: user.id,
                message_tg_id: sent.message_id,
                thread_tg_id: sent.message_thread_id,
                reply_to_id: replyToId,
                sent_at: sent.date,
                text: sent.text || sent.caption,
            });
        }

        return sent;
    }

    async editMessage(text: string, chatId: number, messageId: number, options: SendOptions = {}) {
        const edited = await this.tg.editMessage(text, chatId, messageId, options);
        await this.messageRepository.updateByTelegramId(chatId, messageId, text);
        return edited;
    }

    async deleteMessage(chatId: number, messageId: number) {
        const [deleted] = await Promise.all([
            this.tg.deleteMessage(chatId, messageId),
            this.messageRepository.deleteByTelegramId(chatId, messageId),
        ]);
        return deleted;
    }
}
