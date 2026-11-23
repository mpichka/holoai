import type { Prisma, PrismaClient, Request } from '../../../generated/prisma/client';

export class RequestRepository {
    constructor(private readonly prisma: PrismaClient) {}

    async create(data: Prisma.RequestUncheckedCreateInput, tx?: Prisma.TransactionClient): Promise<Request> {
        const conn = tx ?? this.prisma;

        return conn.request.create({ data });
    }

    async getPending(limit: number): Promise<Request[]> {
        return this.prisma.request.findMany({
            where: { status: 'pending' },
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            take: limit,
        });
    }

    async update(id: number, data: Prisma.RequestUncheckedUpdateInput): Promise<Request> {
        return this.prisma.request.update({ where: { id }, data });
    }
}
