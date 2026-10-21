export type MediaKind = 'text' | 'image' | 'video' | 'audio';

export const MEDIA_KIND: Partial<Record<string, MediaKind>> = {
    photo: 'image',
    live_photo: 'image',
    sticker: 'image',
    animation: 'video',
    video: 'video',
    video_note: 'video',
    audio: 'audio',
    voice: 'audio',
};
