import type {
    Attachment,
    AttachmentToMessage,
    Chat,
    Message,
    Request,
    RequestStatus,
    User,
} from '../../generated/prisma/client';
import type { AttachmentType, MessageWithRelations } from './repositories';

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
        this.firstName = data.firstName ?? undefined;
        this.lastName = data.lastName ?? undefined;
        this.userName = data.username ?? undefined;
        this.languageCode = data.languageCode ?? undefined;
        this.spelledName = data.spelledName ?? undefined;
        this.gender = data.gender ?? undefined;
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
        this.title = data.title ?? undefined;
        this.firstName = data.firstName ?? undefined;
        this.lastName = data.lastName ?? undefined;
        this.userName = data.username ?? undefined;
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
        this.caption = data.caption ?? undefined;
        this.mediaGroupId = data.mediaGroupId ?? undefined;
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
        this.fileSize = data.fileSize ?? undefined;
        this.mimeType = data.mimeType ?? undefined;
        this.fileName = data.fileName ?? undefined;
        this.duration = data.duration ?? undefined;
        this.performer = data.performer ?? undefined;
        this.aiDescription = data.aiDescription ?? undefined;
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
        this.threadTgId = data.threadTgId ?? undefined;
        this.replyToId = data.replyToId ?? undefined;
        this.sentAt = data.sentAt ?? 0;
        this.text = data.text ?? undefined;
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
        this.triggerCommand = data.triggerCommand ?? undefined;
        this.triggerArgs = data.triggerArgs ?? undefined;
        this.status = data.status;
        this.error = data.error ?? undefined;
        this.startedAt = data.startedAt ?? undefined;
        this.finishedAt = data.finishedAt ?? undefined;
        this.responseId = data.responseId ?? undefined;
    }
}

export type LinkedAttachmentModel = Attachment & { rel: AttachmentToMessage };

export type FullMessageModel = MessageModel & {
    chat: ChatModel;
    user: UserModel;
    attachments: LinkedAttachmentModel[];
};

export const toFullMessageModel = ({
    chat,
    user,
    attachments,
    ...message
}: MessageWithRelations): FullMessageModel => ({
    ...new MessageModel(message),
    chat: new ChatModel(chat),
    user: new UserModel(user),
    attachments: attachments.map(({ attachment, ...rel }) => ({ ...attachment, rel })),
});
