export const MESSAGE_COLS = [
    'id',
    'created_at',
    'updated_at',

    'chat_id',
    'user_id',
    'message_tg_id',
    'thread_tg_id',
    'reply_to_id',
    'sent_at',
    'text',
] as const;

export const USER_COLS = [
    'id',
    'created_at',
    'updated_at',

    'tg_id',
    'is_bot',
    'first_name',
    'last_name',
    'username',
    'language_code',
] as const;

export const CHAT_COLS = [
    'id',
    'created_at',
    'updated_at',

    'tg_id',
    'type',
    'title',
    'first_name',
    'last_name',
    'username',
    'is_forum',
    'is_direct_messages',
] as const;

export const ATTACHMENT_COLS = [
    'id',
    'created_at',
    'updated_at',

    'type',
    'file_tg_uid',
    'file_size',
    'mime_type',
    'file_name',
    'duration',
    'performer',

    'ai_description',
] as const;

export const ATTACHMENT_TO_MESSAGE_COLS = [
    'attachment_id',
    'message_id',
    'file_tg_id',
    'caption',
    'media_group_id',
] as const;
