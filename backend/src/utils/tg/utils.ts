import type { Context, Message } from 'node-telegram-bot-api';

export function threadIdOf(ctx: Context): number | undefined {
    return (
        ctx.message?.message_thread_id ??
        ctx.editedMessage?.message_thread_id ??
        ctx.channelPost?.message_thread_id ??
        ctx.editedChannelPost?.message_thread_id
    );
}

export function isReplyToBot(name: string, raw?: Message): boolean {
    const author = raw?.reply_to_message?.from;
    return !!author?.is_bot && author.username?.toLowerCase() === name.toLowerCase();
}

export const EXTENSION_MIME_TYPES: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    tgs: 'application/x-tgsticker',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
    mp3: 'audio/mpeg',
    ogg: 'audio/ogg',
    oga: 'audio/ogg',
    m4a: 'audio/mp4',
    wav: 'audio/wav',
    pdf: 'application/pdf',
};

export function mimeTypeFromPath(filePath: string): string | undefined {
    const extension = filePath.split('.').pop()?.toLowerCase();
    return extension ? EXTENSION_MIME_TYPES[extension] : undefined;
}
