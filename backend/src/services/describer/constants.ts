import { ATTACHMENT_TYPE } from '../../utils/db/repositories';

export const MEDIA_KIND = {
    [ATTACHMENT_TYPE.AUDIO]: 'audio',
    [ATTACHMENT_TYPE.VOICE]: 'audio',

    [ATTACHMENT_TYPE.PHOTO]: 'image',
    [ATTACHMENT_TYPE.ANIMATION]: 'video',
    [ATTACHMENT_TYPE.LIVE_PHOTO]: 'video',

    [ATTACHMENT_TYPE.STICKER_PHOTO]: 'image',
    [ATTACHMENT_TYPE.STICKER_ANIMATION]: 'video',
    [ATTACHMENT_TYPE.STICKER_VIDEO]: 'video',

    [ATTACHMENT_TYPE.VIDEO]: 'video',
    [ATTACHMENT_TYPE.VIDEO_NOTE]: 'video',
} as const;

export type MediaKind = (typeof MEDIA_KIND)[keyof typeof MEDIA_KIND];
