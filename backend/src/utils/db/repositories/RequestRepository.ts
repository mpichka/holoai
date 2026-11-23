import type { Prisma, PrismaClient, Request } from '../../../generated/prisma/client';

export class RequestRepository {
    constructor(private readonly prisma: PrismaClient) {}

    async create(data: Prisma.RequestUncheckedCreateInput, tx?: Prisma.TransactionClient): Promise<Request> {
        const conn = tx ?? this.prisma;

        return conn.request.create({ data });
    }
}
