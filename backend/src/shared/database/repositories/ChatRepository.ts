import type { Chat, Prisma, PrismaClient } from '../../../generated/prisma/client';

export class ChatRepository {
    constructor(private readonly prisma: PrismaClient) {}

    async upsert(data: Prisma.ChatCreateManyInput, tx?: Prisma.TransactionClient): Promise<Chat> {
        const conn = tx ?? this.prisma;
        const { tgId, type, title, username, isForum, isDirectMessages } = data;

        return conn.chat.upsert({
            where: { tgId },
            create: data,
            update: { type, title, username, isForum, isDirectMessages },
        });
    }
}
