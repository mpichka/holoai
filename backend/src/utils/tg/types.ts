import type { Message } from 'node-telegram-bot-api';

export interface ChatContext {
    chatId: number;
    threadId?: number;
    isOwnBot: boolean;
    isReplyToBot: boolean;
    message: Message;
    isNew: boolean;
    isEdited: boolean;
}

export interface SendOptions {
    replyToMessageId?: number;
    messageThreadId?: number;
}
