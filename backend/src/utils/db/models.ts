import type {
    AttachmentRecord,
    AttachmentToMessageRecord,
    AttachmentType,
    ChatRecord,
    MessageRecord,
    UserRecord,
} from './repositories';

export class UserModel {
    id: number;
    createdAt: number;
    updatedAt: number;

    tgId: number;
    isBot: boolean;
    firstName?: string;
    lastName?: string;
    userName?: string;
    languageCode?: string;

    constructor(data: UserRecord) {
        this.id = data.id;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
        this.tgId = data.tg_id;
        this.isBot = data.is_bot;
        this.firstName = data.first_name;
        this.lastName = data.last_name;
        this.userName = data.username;
        this.languageCode = data.language_code;
    }
}

export class ChatModel {
    id: number;
    createdAt: number;
    updatedAt: number;

    tgId: number;
    type: string;
    title?: string;
    firstName?: string;
    lastName?: string;
    userName?: string;
    isForum: boolean;
    isDirectMessages: boolean;

    constructor(data: ChatRecord) {
        this.id = data.id;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
        this.tgId = data.tg_id;
        this.type = data.type;
        this.firstName = data.first_name;
        this.lastName = data.last_name;
        this.userName = data.username;
        this.isForum = data.is_forum;
        this.isDirectMessages = data.is_direct_messages;
    }
}

export class AttachmentToMessageModel {
    attachmentId: number;
    messageId: number;
    // Id that used to fetch the file content
    fileTgId: string;
    // Optional text that was sent alongside the attachment
    caption?: string;
    // Multiple attachments sent as one message
    mediaGroupId?: string;

    constructor(data: AttachmentToMessageRecord) {
        this.attachmentId = data.attachment_id;
        this.messageId = data.message_id;
        this.fileTgId = data.file_tg_id;
        this.caption = data.caption;
        this.mediaGroupId = data.media_group_id;
    }
}

export class AttachmentModel {
    id: number;
    createdAt: number;
    updatedAt: number;

    type: AttachmentType;
    fileTgUid: string;
    fileSize?: number;
    mimeType?: string;
    fileName?: string;
    duration?: number;
    performer?: string;

    aiDescription?: string;

    constructor(data: AttachmentRecord) {
        this.id = data.id;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
        this.type = data.type;
        this.fileTgUid = data.file_tg_uid;
        this.fileSize = data.file_size;
        this.mimeType = data.mime_type;
        this.fileName = data.file_name;
        this.duration = data.duration;
        this.performer = data.performer;
        this.aiDescription = data.ai_description;
    }
}

export class MessageModel {
    id: number;
    createdAt: number;
    updatedAt: number;

    chatId: number;
    userId: number;

    messageTgId: number;
    threadTgId?: number;
    replyToId?: number;
    sentAt: number;
    text?: string;

    constructor(data: MessageRecord) {
        this.id = data.id;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
        this.chatId = data.chat_id;
        this.userId = data.user_id;
        this.messageTgId = data.message_tg_id;
        this.threadTgId = data.thread_tg_id;
        this.replyToId = data.reply_to_id;
        this.sentAt = data.sent_at;
        this.text = data.text;
    }
}
