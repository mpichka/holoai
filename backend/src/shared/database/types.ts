export type FileType =
    'photo' | 'live_photo' | 'video' | 'animation' | 'audio' | 'voice' | 'video_note' | 'sticker' | 'document';

/** One of the resolutions Telegram offers for a photo. */
export interface FilePhotoSize {
    fileId: string;
    fileUniqueId: string;
    width: number;
    height: number;
    fileSize?: number;
}
