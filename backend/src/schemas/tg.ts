import { z } from 'zod';

export const telegramSendBody = z.object({
    chatId: z.number(),
    text: z.string().min(1),
    threadId: z.number().optional(),
    replyToMessageId: z.number().optional(),
});

export const telegramEditBody = z.object({
    chatId: z.number(),
    messageId: z.number(),
    text: z.string().min(1),
});

export const telegramDeleteBody = z.object({
    chatId: z.number(),
    messageId: z.number(),
});

export const telegramReactBody = z.object({
    chatId: z.number(),
    messageId: z.number(),
});

export type TelegramSendBody = z.infer<typeof telegramSendBody>;
export type TelegramEditBody = z.infer<typeof telegramEditBody>;
export type TelegramDeleteBody = z.infer<typeof telegramDeleteBody>;
export type TelegramReactBody = z.infer<typeof telegramReactBody>;
