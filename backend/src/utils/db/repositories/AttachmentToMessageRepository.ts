import type { AttachmentToMessage, Prisma, PrismaClient } from '../../../generated/prisma/client';

export class AttachmentToMessageRepository {
    constructor(private readonly prisma: PrismaClient) {}

    async upsert(data: Prisma.AttachmentToMessageCreateManyInput): Promise<AttachmentToMessage> {
        const { messageId, attachmentId, fileTgId, caption, mediaGroupId } = data;

        return this.prisma.attachmentToMessage.upsert({
            where: { messageId_attachmentId: { messageId, attachmentId } },
            create: data,
            update: { fileTgId, caption, mediaGroupId },
        });
    }
}
