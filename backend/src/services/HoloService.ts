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
    ATTACHMENT_COLS,
    ATTACHMENT_TO_MESSAGE_COLS,
    CHAT_COLS,
    ChatModel,
    MESSAGE_COLS,
    MessageModel,
    USER_COLS,
    UserModel,
    pickFromAlias,
} from '../utils/db';
import {
    ATTACHMENT_TYPE,
    type AttachmentRecord,
    type AttachmentRepository,
    type AttachmentToMessageRecord,
    type AttachmentToMessageRepository,
    type ChatRecord,
    type ChatRepository,
    type MessageRecord,
    type MessageRepository,
    type NewChatRecord,
    type NewMessageRecord,
    type NewUserRecord,
    type StickerType,
    type UserRecord,
    type UserRepository,
} from '../utils/db/repositories';
import type { Container } from '../utils/di';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // One day

interface CacheEntry<T> {
    payload: T;
    timestamp: number;
}

interface MessageCreationOptions {
    user_id: number;
    chat_id: number;
    reply_to_id?: number;
}

interface AttachmentCreationOptions {
    message_id: number;
    caption?: string;
    media_group_id?: string;
}

export type LinkedAttachmentModel = AttachmentRecord & { rel: AttachmentToMessageRecord };

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

    private userCache = new Map<number, CacheEntry<UserRecord>>();
    private chatCache = new Map<number, CacheEntry<ChatRecord>>();

    constructor(container: Container) {
        const db = container.Database;
        this.userRepository = db.userRepository;
        this.chatRepository = db.chatRepository;
        this.messageRepository = db.messageRepository;
        this.attachmentRepository = db.attachmentRepository;
        this.attachmentToMessageRepository = db.attachmentToMessageRepository;
    }

    async upsertTgUser(user?: User): Promise<UserRecord | null> {
        if (!user) return null;

        const payload: NewUserRecord = {
            tg_id: user.id,
            is_bot: user.is_bot,
            first_name: user.first_name,
            last_name: user.last_name,
            username: user.username,
            language_code: user.language_code,
        };

        const cache = this.getCached<UserRecord>(this.userCache, payload);

        if (cache) return cache;

        const data = await this.userRepository.upsert(payload);

        this.userCache.set(payload.tg_id, { payload: data, timestamp: Date.now() });

        return data;
    }

    async upsertTgChat(chat?: Chat): Promise<ChatRecord | null> {
        if (!chat) return null;

        const payload: NewChatRecord = {
            tg_id: chat.id,
            type: chat.type,
            title: chat.title,
            first_name: chat.first_name,
            last_name: chat.last_name,
            username: chat.username,
            is_forum: Boolean(chat.is_forum),
            is_direct_messages: Boolean(chat.is_direct_messages),
        };

        const cache = this.getCached<ChatRecord>(this.chatCache, payload);

        if (cache) return cache;

        const data = await this.chatRepository.upsert(payload);

        this.chatCache.set(payload.tg_id, { payload: data, timestamp: Date.now() });

        return data;
    }

    async upsertMessage(message: Message, options: MessageCreationOptions): Promise<MessageRecord | null> {
        if (!message) return null;

        const payload: NewMessageRecord = {
            chat_id: options.chat_id,
            user_id: options.user_id,
            message_tg_id: message.message_id,
            thread_tg_id: message.message_thread_id,
            reply_to_id: options.reply_to_id,
            sent_at: message.date,
            text: message.text || message.caption,
        };

        return this.messageRepository.upsert(payload);
    }

    private getCached<T>(cache: Map<number, CacheEntry<any>>, payload: { tg_id: number }): T | null {
        const entry = cache.get(payload.tg_id);
        if (!entry) return null;

        if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
            cache.delete(payload.tg_id);
            return null;
        }

        const cacheKeys = Object.keys(entry.payload);
        const payloadKeys = Object.keys(payload);

        if (cacheKeys.length !== payloadKeys.length) return null;

        for (const key of cacheKeys) {
            if ((entry.payload as Record<string, unknown>)[key] !== (payload as Record<string, unknown>)[key]) {
                return null;
            }
        }

        return entry.payload as T;
    }

    async createAudioAttachment(audio: Audio, options: AttachmentCreationOptions) {
        const attachment = await this.attachmentRepository.upsert({
            type: ATTACHMENT_TYPE.AUDIO,
            file_tg_uid: audio.file_unique_id,
            file_size: audio.file_size,
            duration: audio.duration,
            mime_type: audio.mime_type,
            file_name: audio.file_name,
            performer: audio.performer,
        });

        await this.attachmentToMessageRepository.upsert({
            attachment_id: attachment.id,
            file_tg_id: audio.file_id,
            ...options,
        });
    }

    async createVoiceAttachment(voice: Voice, options: AttachmentCreationOptions) {
        const attachment = await this.attachmentRepository.upsert({
            type: ATTACHMENT_TYPE.AUDIO,
            file_tg_uid: voice.file_unique_id,
            file_size: voice.file_size,
            duration: voice.duration,
            mime_type: voice.mime_type,
        });

        await this.attachmentToMessageRepository.upsert({
            attachment_id: attachment.id,
            file_tg_id: voice.file_id,
            ...options,
        });
    }

    async createPhotoAttachment(photo: PhotoSize, options: AttachmentCreationOptions) {
        const attachment = await this.attachmentRepository.upsert({
            type: ATTACHMENT_TYPE.PHOTO,
            file_tg_uid: photo.file_unique_id,
            file_size: photo.file_size,
        });

        await this.attachmentToMessageRepository.upsert({
            attachment_id: attachment.id,
            file_tg_id: photo.file_id,
            ...options,
        });
    }

    async createAnimationAttachment(animation: Animation, options: AttachmentCreationOptions) {
        const attachment = await this.attachmentRepository.upsert({
            type: ATTACHMENT_TYPE.ANIMATION,
            file_tg_uid: animation.file_unique_id,
            file_size: animation.file_size,
            duration: animation.duration,
            mime_type: animation.mime_type,
            file_name: animation.file_name,
        });

        await this.attachmentToMessageRepository.upsert({
            attachment_id: attachment.id,
            file_tg_id: animation.file_id,
            ...options,
        });
    }

    async createLivePhotoAttachment(livePhoto: LivePhoto, options: AttachmentCreationOptions) {
        const attachment = await this.attachmentRepository.upsert({
            type: ATTACHMENT_TYPE.LIVE_PHOTO,
            file_tg_uid: livePhoto.file_unique_id,
            file_size: livePhoto.file_size,
            duration: livePhoto.duration,
            mime_type: livePhoto.mime_type,
        });

        await this.attachmentToMessageRepository.upsert({
            attachment_id: attachment.id,
            file_tg_id: livePhoto.file_id,
            ...options,
        });
    }

    async createStickerAttachment(sticker: Sticker, options: AttachmentCreationOptions) {
        let stickerType: StickerType = ATTACHMENT_TYPE.STICKER_PHOTO;
        if (sticker.is_animated) stickerType = ATTACHMENT_TYPE.STICKER_ANIMATION;
        if (sticker.is_video) stickerType = ATTACHMENT_TYPE.STICKER_VIDEO;

        const attachment = await this.attachmentRepository.upsert({
            type: stickerType,
            file_tg_uid: sticker.file_unique_id,
            file_size: sticker.file_size,
        });

        await this.attachmentToMessageRepository.upsert({
            attachment_id: attachment.id,
            file_tg_id: sticker.file_id,
            ...options,
        });
    }

    async createVideoAttachment(video: Video, options: AttachmentCreationOptions) {
        const attachment = await this.attachmentRepository.upsert({
            type: ATTACHMENT_TYPE.VIDEO,
            file_tg_uid: video.file_unique_id,
            file_size: video.file_size,
            duration: video.duration,
            mime_type: video.mime_type,
        });

        await this.attachmentToMessageRepository.upsert({
            attachment_id: attachment.id,
            file_tg_id: video.file_id,
            ...options,
        });
    }

    async createVideoNoteAttachment(videoNote: VideoNote, options: AttachmentCreationOptions) {
        const attachment = await this.attachmentRepository.upsert({
            type: ATTACHMENT_TYPE.VIDEO_NOTE,
            file_tg_uid: videoNote.file_unique_id,
            file_size: videoNote.file_size,
            duration: videoNote.duration,
        });

        await this.attachmentToMessageRepository.upsert({
            attachment_id: attachment.id,
            file_tg_id: videoNote.file_id,
            ...options,
        });
    }

    async getFullMessage(chat_tg_id?: number, message_tg_id?: number) {
        if (!chat_tg_id || !message_tg_id) return null;

        const rows = await this.messageRepository.getMessage(chat_tg_id, message_tg_id);

        if (!rows.length) return null;

        const firstRow = rows[0];

        const attachments = rows
            .filter((row) => row.a_id != null)
            .map((row) => {
                const attachment = pickFromAlias<LinkedAttachmentModel>(row, 'a_', ATTACHMENT_COLS);
                attachment.rel = pickFromAlias<AttachmentToMessageRecord>(row, 'atm_', ATTACHMENT_TO_MESSAGE_COLS);
                return attachment;
            });

        const chat = new ChatModel(pickFromAlias<ChatRecord>(firstRow, 'c_', CHAT_COLS));
        const user = new UserModel(pickFromAlias<UserRecord>(firstRow, 'u_', USER_COLS));
        const message = new MessageModel(pickFromAlias<MessageRecord>(firstRow, 'm_', MESSAGE_COLS));

        return {
            ...message,
            chat,
            user,
            attachments,
        } as FullMessageModel;
    }

    markAsReply(messageId: number, repliedMessageId: number) {
        return this.messageRepository.markAsReply(messageId, repliedMessageId);
    }
}
