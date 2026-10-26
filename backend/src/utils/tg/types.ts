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

export type ChatAction =
    | 'typing'
    | 'upload_photo'
    | 'record_video'
    | 'upload_video'
    | 'record_voice'
    | 'upload_voice'
    | 'upload_document'
    | 'find_location'
    | 'record_video_note'
    | 'upload_video_note';
