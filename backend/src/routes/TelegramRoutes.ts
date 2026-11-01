import { SuccessDto } from '../dtos';
import {
    type TelegramDeleteBody,
    telegramDeleteBody,
    type TelegramEditBody,
    telegramEditBody,
    type TelegramSendBody,
    telegramSendBody,
} from '../schemas';
import type { Container } from '../utils/di';
import type { Data, Routes } from '../utils/router';
import type { TelegramBot } from '../utils/tg';

export class TelegramRoutes implements Routes {
    basePath = 'tg';

    routes = [
        {
            path: '',
            method: 'post',
            schema: { body: telegramSendBody },
            handler: this.create,
        },
        {
            path: '',
            method: 'patch',
            schema: { body: telegramEditBody },
            handler: this.edit,
        },
        {
            path: '',
            method: 'delete',
            schema: { body: telegramDeleteBody },
            handler: this.remove,
        },
    ];

    private tg: TelegramBot;

    constructor(container: Container) {
        this.tg = container.TelegramBot;
    }

    async create({ body }: Data<null, null, TelegramSendBody>) {
        const { chatId, text, threadId, replyToMessageId } = body;

        const sent = await this.tg.sendMessage(text, chatId, {
            messageThreadId: threadId,
            replyToMessageId,
        });

        return sent;
    }

    async edit({ body }: Data<null, null, TelegramEditBody>) {
        const { chatId, messageId, text } = body;

        const edited = await this.tg.editMessage(text, chatId, messageId);

        return edited;
    }

    async remove({ body }: Data<null, null, TelegramDeleteBody>) {
        await this.tg.deleteMessage(body.chatId, body.messageId);

        return SuccessDto.format();
    }
}
