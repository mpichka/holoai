import type { Attachment, Prisma, PrismaClient } from '../../../generated/prisma/client';

export const ATTACHMENT_TYPE = Object.freeze({
    AUDIO: 10,
    VOICE: 11,
    PHOTO: 20,
    ANIMATION: 21,
    LIVE_PHOTO: 22,
    STICKER_PHOTO: 30,
    STICKER_ANIMATION: 31,
    STICKER_VIDEO: 32,
    VIDEO: 40,
    VIDEO_NOTE: 41,
});
export const ATTACHMENT_TYPE_NAMES: Record<number, string> = Object.fromEntries(
    Object.entries(ATTACHMENT_TYPE).map(([name, value]) => [value, name.toLowerCase()] as [number, string]),
);
export const AUDIO_TYPES: number[] = [ATTACHMENT_TYPE.AUDIO, ATTACHMENT_TYPE.VOICE];
export const IMAGE_TYPES: number[] = [ATTACHMENT_TYPE.PHOTO, ATTACHMENT_TYPE.LIVE_PHOTO, ATTACHMENT_TYPE.ANIMATION];
export const VIDEO_TYPES: number[] = [ATTACHMENT_TYPE.VIDEO, ATTACHMENT_TYPE.VIDEO_NOTE];
export const STICKER_TYPES: number[] = [
    ATTACHMENT_TYPE.STICKER_PHOTO,
    ATTACHMENT_TYPE.STICKER_ANIMATION,
    ATTACHMENT_TYPE.STICKER_VIDEO,
];
export const NON_AUDIO_TYPES = [...IMAGE_TYPES, ...VIDEO_TYPES, ...STICKER_TYPES];
export type StickerType =
    | (typeof ATTACHMENT_TYPE)['STICKER_PHOTO']
    | (typeof ATTACHMENT_TYPE)['STICKER_ANIMATION']
    | (typeof ATTACHMENT_TYPE)['STICKER_VIDEO'];
export type AttachmentType = (typeof ATTACHMENT_TYPE)[keyof typeof ATTACHMENT_TYPE];
export class AttachmentRepository {
    constructor(private readonly prisma: PrismaClient) {}

    async upsert(data: Prisma.AttachmentCreateManyInput): Promise<Attachment> {
        const { fileTgUid, fileSize, mimeType, fileName, duration, performer } = data;

        return this.prisma.attachment.upsert({
            where: { fileTgUid },
            create: data,
            update: { fileSize, mimeType, fileName, duration, performer },
        });
    }

    async setAiDescription(id: number, aiDescription: string) {
        await this.prisma.attachment.updateMany({ where: { id }, data: { aiDescription } });
    }
}
