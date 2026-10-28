export const CHAT_ACTION = Object.freeze({
    TYPING: 'typing',
    UPLOAD_PHOTO: 'upload_photo',
    record_video: 'record_video',
    upload_video: 'upload_video',
    record_voice: 'record_voice',
    upload_voice: 'upload_voice',
    upload_document: 'upload_document',
    find_location: 'find_location',
    record_video_note: 'record_video_note',
    upload_video_note: 'upload_video_note',
});

export type ChatAction = typeof CHAT_ACTION[keyof typeof CHAT_ACTION];
