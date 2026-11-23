import { Container } from '../../core/di';
import {
    AttachmentRepository,
    AttachmentToMessageRepository,
    ChatRepository,
    MessageRepository,
    RequestRepository,
    UserRepository,
} from './repositories';

export class DatabaseService {
    userRepository: UserRepository;
    chatRepository: ChatRepository;
    messageRepository: MessageRepository;
    requestRepository: RequestRepository;
    attachmentRepository: AttachmentRepository;
    attachmentToMessageRepository: AttachmentToMessageRepository;

    constructor(container: Container) {
        const prisma = container.Database.prisma;

        this.userRepository = new UserRepository(prisma);
        this.chatRepository = new ChatRepository(prisma);
        this.messageRepository = new MessageRepository(prisma);
        this.requestRepository = new RequestRepository(prisma);
        this.attachmentRepository = new AttachmentRepository(prisma);
        this.attachmentToMessageRepository = new AttachmentToMessageRepository(prisma);
    }
}
