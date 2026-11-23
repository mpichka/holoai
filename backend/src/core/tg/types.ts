import type { Message } from 'node-telegram-bot-api';
import type { Container } from '../di';

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
    parseMode?: string;
}

export interface MessageHandler {
    handle(ctx: ChatContext): Promise<void>;
}

export type MessageHandlerConstructor = new (container: Container) => MessageHandler;
