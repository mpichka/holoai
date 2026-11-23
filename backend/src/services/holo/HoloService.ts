import type {
    Animation,
    Audio,
    Chat,
    LivePhoto,
    Message,
    PhotoSize,
    Sticker,
    User,
    Video,
    VideoNote,
    Voice,
} from 'node-telegram-bot-api';
import {
    AUDIO_PROCESS_MULTIPLIER,
    IMAGE_PROCESS_MULTIPLIER,
    MESSAGE_PROCESS_MULTIPLIER,
    VIDEO_PROCESS_MULTIPLIER,
} from '../../constants';
import type {
    Attachment,
    AttachmentToMessage,
    Chat as ChatRecord,
    Message as MessageRecord,
    Prisma,
    User as UserRecord,
} from '../../generated/prisma/client';
import { ChatModel, MessageModel, RequestModel, UserModel } from '../../utils/db';
import {
    ATTACHMENT_TYPE,
    ATTACHMENT_TYPE_NAMES,
    AUDIO_TYPES,
    IMAGE_TYPES,
    VIDEO_TYPES,
    type AttachmentRepository,
    type AttachmentToMessageRepository,
    type ChatRepository,
    type MessageRepository,
    type MessageWithRelations,
    type RequestRepository,
    type StickerType,
    type UserRepository,
} from '../../utils/db/repositories';
import type { Container } from '../../utils/di';
import type { Trigger } from '../trigger/types';
import { ChatSummaryMetadata } from './types';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // One day

interface CacheEntry<TInput, TRecord> {
    // Input that produced the record; a matching input means the record is still up to date
    input: TInput;
    record: TRecord;
    timestamp: number;
}

interface MessageCreationOptions {
    userId: number;
    chatId: number;
    replyToId?: number;
}

interface AttachmentCreationOptions {
    messageId: number;
    caption?: string;
    mediaGroupId?: string;
}

export type LinkedAttachmentModel = Attachment & { rel: AttachmentToMessage };

export type FullMessageModel = MessageModel & {
    chat: ChatModel;
    user: UserModel;
    attachments: LinkedAttachmentModel[];
};

export class HoloService {
    userRepository: UserRepository;
    chatRepository: ChatRepository;
    messageRepository: MessageRepository;
    attachmentRepository: AttachmentRepository;
    attachmentToMessageRepository: AttachmentToMessageRepository;
    requestRepository: RequestRepository;

    private userCache = new Map<number, CacheEntry<Prisma.UserCreateManyInput, UserRecord>>();
    private chatCache = new Map<number, CacheEntry<Prisma.ChatCreateManyInput, ChatRecord>>();

    constructor(container: Container) {
        const db = container.Database;
        this.userRepository = db.userRepository;
        this.chatRepository = db.chatRepository;
        this.messageRepository = db.messageRepository;
        this.attachmentRepository = db.attachmentRepository;
        this.attachmentToMessageRepository = db.attachmentToMessageRepository;
        this.requestRepository = db.requestRepository;
    }

    async upsertTgUser(user?: User): Promise<UserRecord | null> {
        if (!user) return null;

        const payload: Prisma.UserCreateManyInput = {
            tgId: user.id,
            isBot: user.is_bot,
            firstName: user.first_name,
            lastName: user.last_name,
            username: user.username,
            languageCode: user.language_code,
        };

        const cached = this.getCached(this.userCache, user.id, payload);
        if (cached) return cached;

        const record = await this.userRepository.upsert(payload);

        this.userCache.set(user.id, { input: payload, record, timestamp: Date.now() });

        return record;
    }

    async upsertTgChat(chat?: Chat): Promise<ChatRecord | null> {
        if (!chat) return null;

        const payload: Prisma.ChatCreateManyInput = {
            tgId: chat.id,
            type: chat.type,
            title: chat.title,
            firstName: chat.first_name,
            lastName: chat.last_name,
            username: chat.username,
            isForum: Boolean(chat.is_forum),
            isDirectMessages: Boolean(chat.is_direct_messages),
        };

        const cached = this.getCached(this.chatCache, chat.id, payload);
        if (cached) return cached;

        const record = await this.chatRepository.upsert(payload);

        this.chatCache.set(chat.id, { input: payload, record, timestamp: Date.now() });

        return record;
    }

    async upsertMessage(message: Message, options: MessageCreationOptions): Promise<MessageRecord | null> {
        if (!message) return null;

        return this.messageRepository.upsert({
            chatId: options.chatId,
            userId: options.userId,
            messageTgId: message.message_id,
            threadTgId: message.message_thread_id,
            replyToId: options.replyToId,
            sentAt: message.date,
            text: message.text || message.caption,
        });
    }

    private getCached<TInput extends object, TRecord>(
        cache: Map<number, CacheEntry<TInput, TRecord>>,
        tgId: number,
        input: TInput,
    ): TRecord | null {
        const entry = cache.get(tgId);
        if (!entry) return null;

        if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
            cache.delete(tgId);
            return null;
        }

        const cachedInput = entry.input as Record<string, unknown>;
        const nextInput = input as Record<string, unknown>;
        const keys = new Set([...Object.keys(cachedInput), ...Object.keys(nextInput)]);

        for (const key of keys) {
            if (cachedInput[key] !== nextInput[key]) return null;
        }

        return entry.record;
    }

    async createAudioAttachment(audio: Audio, options: AttachmentCreationOptions) {
        const attachment = await this.attachmentRepository.upsert({
            type: ATTACHMENT_TYPE.AUDIO,
            fileTgUid: audio.file_unique_id,
            fileSize: audio.file_size,
            duration: audio.duration,
            mimeType: audio.mime_type,
            fileName: audio.file_name,
            performer: audio.performer,
        });

        await this.attachmentToMessageRepository.upsert({
            attachmentId: attachment.id,
            fileTgId: audio.file_id,
            ...options,
        });
    }

    async createVoiceAttachment(voice: Voice, options: AttachmentCreationOptions) {
        const attachment = await this.attachmentRepository.upsert({
            type: ATTACHMENT_TYPE.AUDIO,
            fileTgUid: voice.file_unique_id,
            fileSize: voice.file_size,
            duration: voice.duration,
            mimeType: voice.mime_type,
        });

        await this.attachmentToMessageRepository.upsert({
            attachmentId: attachment.id,
            fileTgId: voice.file_id,
            ...options,
        });
    }

    async createPhotoAttachment(photo: PhotoSize, options: AttachmentCreationOptions) {
        const attachment = await this.attachmentRepository.upsert({
            type: ATTACHMENT_TYPE.PHOTO,
            fileTgUid: photo.file_unique_id,
            fileSize: photo.file_size,
        });

        await this.attachmentToMessageRepository.upsert({
            attachmentId: attachment.id,
            fileTgId: photo.file_id,
            ...options,
        });
    }

    async createAnimationAttachment(animation: Animation, options: AttachmentCreationOptions) {
        const attachment = await this.attachmentRepository.upsert({
            type: ATTACHMENT_TYPE.ANIMATION,
            fileTgUid: animation.file_unique_id,
            fileSize: animation.file_size,
            duration: animation.duration,
            mimeType: animation.mime_type,
            fileName: animation.file_name,
        });

        await this.attachmentToMessageRepository.upsert({
            attachmentId: attachment.id,
            fileTgId: animation.file_id,
            ...options,
        });
    }

    async createLivePhotoAttachment(livePhoto: LivePhoto, options: AttachmentCreationOptions) {
        const attachment = await this.attachmentRepository.upsert({
            type: ATTACHMENT_TYPE.LIVE_PHOTO,
            fileTgUid: livePhoto.file_unique_id,
            fileSize: livePhoto.file_size,
            duration: livePhoto.duration,
            mimeType: livePhoto.mime_type,
        });

        await this.attachmentToMessageRepository.upsert({
            attachmentId: attachment.id,
            fileTgId: livePhoto.file_id,
            ...options,
        });
    }

    async createStickerAttachment(sticker: Sticker, options: AttachmentCreationOptions) {
        let stickerType: StickerType = ATTACHMENT_TYPE.STICKER_PHOTO;
        if (sticker.is_animated) stickerType = ATTACHMENT_TYPE.STICKER_ANIMATION;
        if (sticker.is_video) stickerType = ATTACHMENT_TYPE.STICKER_VIDEO;

        const attachment = await this.attachmentRepository.upsert({
            type: stickerType,
            fileTgUid: sticker.file_unique_id,
            fileSize: sticker.file_size,
        });

        await this.attachmentToMessageRepository.upsert({
            attachmentId: attachment.id,
            fileTgId: sticker.file_id,
            ...options,
        });
    }

    async createVideoAttachment(video: Video, options: AttachmentCreationOptions) {
        const attachment = await this.attachmentRepository.upsert({
            type: ATTACHMENT_TYPE.VIDEO,
            fileTgUid: video.file_unique_id,
            fileSize: video.file_size,
            duration: video.duration,
            mimeType: video.mime_type,
        });

        await this.attachmentToMessageRepository.upsert({
            attachmentId: attachment.id,
            fileTgId: video.file_id,
            ...options,
        });
    }

    async createVideoNoteAttachment(videoNote: VideoNote, options: AttachmentCreationOptions) {
        const attachment = await this.attachmentRepository.upsert({
            type: ATTACHMENT_TYPE.VIDEO_NOTE,
            fileTgUid: videoNote.file_unique_id,
            fileSize: videoNote.file_size,
            duration: videoNote.duration,
        });

        await this.attachmentToMessageRepository.upsert({
            attachmentId: attachment.id,
            fileTgId: videoNote.file_id,
            ...options,
        });
    }

    async getFullMessage(chatTgId?: number, messageTgId?: number): Promise<FullMessageModel | null> {
        if (!chatTgId || !messageTgId) return null;

        const message = await this.messageRepository.getMessage(chatTgId, messageTgId);

        return message ? this.toFullMessage(message) : null;
    }

    async getFullMessages(
        chatTgId: number,
        limit: number,
        threadTgId: number | null,
        offset: number = 0,
    ): Promise<FullMessageModel[]> {
        const messages = await this.messageRepository.getMessages(chatTgId, { limit, offset, threadTgId });

        return messages.map((message) => this.toFullMessage(message));
    }

    async getFullMessagesInDateRange(
        chatTgId: number,
        from: number,
        to: number,
        threadTgId: number | null,
    ): Promise<FullMessageModel[]> {
        const messages = await this.messageRepository.getMessagesInDateRange(chatTgId, { from, to, threadTgId });

        return messages.map((message) => this.toFullMessage(message));
    }

    private toFullMessage({ chat, user, attachments, ...message }: MessageWithRelations): FullMessageModel {
        return {
            ...new MessageModel(message),
            chat: new ChatModel(chat),
            user: new UserModel(user),
            attachments: attachments.map(({ attachment, ...rel }) => ({ ...attachment, rel })),
        };
    }

    markAsReply(messageId: number, repliedMessageId: number) {
        return this.messageRepository.markAsReply(messageId, repliedMessageId);
    }

    async createRequest(messageId: number, trigger: Trigger): Promise<RequestModel> {
        const record = await this.requestRepository.create({
            messageId,
            triggerReason: trigger.reason,
            triggerCommand: trigger.command,
            triggerArgs: trigger.args,
        });

        return new RequestModel(record);
    }

    deleteMessage(id: number) {
        return this.messageRepository.deleteById(id);
    }

    calculateChatSummaryMetadata(messages: FullMessageModel[]): ChatSummaryMetadata {
        const attachments = messages.flatMap((message) => message.attachments);

        const attachmentsCount: Record<string, number> = {};

        for (const attachment of attachments) {
            const typeName = ATTACHMENT_TYPE_NAMES[attachment.type];
            attachmentsCount[typeName] = (attachmentsCount[typeName] ?? 0) + 1;
        }

        let images = 0;
        let audioDuration = 0;
        let videoDuration = 0;

        for (const attachment of attachments) {
            if (IMAGE_TYPES.includes(attachment.type)) {
                images++;
            } else if (AUDIO_TYPES.includes(attachment.type)) {
                audioDuration += attachment.duration || 0;
            } else if (VIDEO_TYPES.includes(attachment.type)) {
                videoDuration += attachment.duration || 0;
            }
        }

        return {
            messagesCount: messages.length,
            estimate:
                (messages.length / 100) * MESSAGE_PROCESS_MULTIPLIER +
                images * IMAGE_PROCESS_MULTIPLIER +
                audioDuration * AUDIO_PROCESS_MULTIPLIER +
                videoDuration * VIDEO_PROCESS_MULTIPLIER,
        };
    }
}
