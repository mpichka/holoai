import type { Prisma, PrismaClient, User } from '../../../generated/prisma/client';

export class UserRepository {
    constructor(private readonly prisma: PrismaClient) {}

    async upsert(data: Prisma.UserCreateManyInput, tx?: Prisma.TransactionClient): Promise<User> {
        const conn = tx ?? this.prisma;
        const { tgId, isBot, firstName, lastName, username, languageCode } = data;

        return conn.user.upsert({
            where: { tgId },
            create: data,
            update: { isBot, firstName, lastName, username, languageCode },
        });
    }
}
