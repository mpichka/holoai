import type {
    Attachment,
    AttachmentToMessage,
    Chat,
    Message,
    Request,
    RequestStatus,
    User,
} from '../../generated/prisma/client';
import type { AttachmentType } from './repositories';
import { optional } from './utils';

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
    spelledName?: string;
    gender?: string;

    constructor(data: User) {
        this.id = data.id;
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
        this.tgId = Number(data.tgId);
        this.isBot = data.isBot;
        this.firstName = optional(data.firstName);
        this.lastName = optional(data.lastName);
        this.userName = optional(data.username);
        this.languageCode = optional(data.languageCode);
        this.spelledName = optional(data.spelledName);
        this.gender = optional(data.gender);
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

    constructor(data: Chat) {
        this.id = data.id;
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
        this.tgId = Number(data.tgId);
        this.type = data.type;
        this.title = optional(data.title);
        this.firstName = optional(data.firstName);
        this.lastName = optional(data.lastName);
        this.userName = optional(data.username);
        this.isForum = data.isForum;
        this.isDirectMessages = data.isDirectMessages;
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

    constructor(data: AttachmentToMessage) {
        this.attachmentId = data.attachmentId;
        this.messageId = data.messageId;
        this.fileTgId = data.fileTgId;
        this.caption = optional(data.caption);
        this.mediaGroupId = optional(data.mediaGroupId);
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

    constructor(data: Attachment) {
        this.id = data.id;
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
        this.type = data.type as AttachmentType;
        this.fileTgUid = data.fileTgUid;
        this.fileSize = optional(data.fileSize);
        this.mimeType = optional(data.mimeType);
        this.fileName = optional(data.fileName);
        this.duration = optional(data.duration);
        this.performer = optional(data.performer);
        this.aiDescription = optional(data.aiDescription);
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

    constructor(data: Message) {
        this.id = data.id;
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
        this.chatId = data.chatId;
        this.userId = data.userId;
        this.messageTgId = data.messageTgId;
        this.threadTgId = optional(data.threadTgId);
        this.replyToId = optional(data.replyToId);
        this.sentAt = data.sentAt ?? 0;
        this.text = optional(data.text);
    }
}

export class RequestModel {
    id: number;
    createdAt: number;
    updatedAt: number;

    messageId: number;

    triggerReason: string;
    triggerCommand?: string;
    triggerArgs?: string;

    status: RequestStatus;
    error?: string;
    startedAt?: number;
    finishedAt?: number;
    // Bot message sent in response to the request
    responseId?: number;

    constructor(data: Request) {
        this.id = data.id;
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
        this.messageId = data.messageId;
        this.triggerReason = data.triggerReason;
        this.triggerCommand = optional(data.triggerCommand);
        this.triggerArgs = optional(data.triggerArgs);
        this.status = data.status;
        this.error = optional(data.error);
        this.startedAt = optional(data.startedAt);
        this.finishedAt = optional(data.finishedAt);
        this.responseId = optional(data.responseId);
    }
}
