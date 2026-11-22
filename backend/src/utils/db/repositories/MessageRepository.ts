import type { Message, Prisma, PrismaClient } from '../../../generated/prisma/client';

const fullMessageInclude = {
    chat: true,
    user: true,
    attachments: {
        include: { attachment: true },
        orderBy: { attachmentId: 'asc' },
    },
} satisfies Prisma.MessageInclude;

export type MessageWithRelations = Prisma.MessageGetPayload<{ include: typeof fullMessageInclude }>;

export class MessageRepository {
    constructor(private readonly prisma: PrismaClient) {}

    async upsert(data: Prisma.MessageCreateManyInput, tx?: Prisma.TransactionClient): Promise<Message> {
        const conn = tx ?? this.prisma;
        const { chatId, messageTgId, threadTgId, replyToId, sentAt, text } = data;

        return conn.message.upsert({
            where: { chatId_messageTgId: { chatId, messageTgId } },
            create: data,
            update: { threadTgId, replyToId, sentAt, text },
        });
    }

    async getMessage(chatTgId: number, messageTgId: number): Promise<MessageWithRelations | null> {
        return this.prisma.message.findFirst({
            where: { messageTgId, chat: { tgId: chatTgId } },
            include: fullMessageInclude,
        });
    }

    async getIdByTelegramId(chatTgId: number, messageTgId: number): Promise<number | undefined> {
        const row = await this.prisma.message.findFirst({
            where: { messageTgId, chat: { tgId: chatTgId } },
            select: { id: true },
        });

        return row?.id;
    }

    async getMessages(
        chatTgId: number,
        { limit, offset, threadTgId }: { limit: number; offset: number; threadTgId?: number | null },
    ): Promise<MessageWithRelations[]> {
        return this.prisma.message.findMany({
            where: { chat: { tgId: chatTgId }, threadTgId: threadTgId ?? null },
            include: fullMessageInclude,
            orderBy: [{ sentAt: 'asc' }, { id: 'asc' }],
            skip: offset,
            take: limit,
        });
    }

    async getMessagesInDateRange(
        chatTgId: number,
        { from, to, threadTgId }: { from: number; to: number; threadTgId?: number | null },
    ): Promise<MessageWithRelations[]> {
        return this.prisma.message.findMany({
            where: { chat: { tgId: chatTgId }, threadTgId: threadTgId ?? null, sentAt: { gte: from, lte: to } },
            include: fullMessageInclude,
            orderBy: [{ sentAt: 'asc' }, { id: 'asc' }],
        });
    }

    async markAsReply(id: number, replyToId: number) {
        await this.prisma.message.updateMany({ where: { id }, data: { replyToId } });
    }

    async deleteById(id: number) {
        await this.prisma.message.deleteMany({ where: { id } });
    }

    async updateByTelegramId(chatTgId: number, messageTgId: number, text: string) {
        await this.prisma.message.updateMany({
            where: { messageTgId, chat: { tgId: chatTgId } },
            data: { text },
        });
    }

    async deleteByTelegramId(chatTgId: number, messageTgId: number) {
        await this.prisma.message.deleteMany({ where: { messageTgId, chat: { tgId: chatTgId } } });
    }
}
