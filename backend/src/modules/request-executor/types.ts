export type Command = {
    category: string;
    type?: string;
    args?: unknown;
};

export type SummarizeScope = { mode: 'count'; count: number } | { mode: 'range'; from: number; to: number };

export interface ChatSummaryMetadata {
    messagesCount: number;
    estimate: number;
}

export interface TranscriptAttachment {
    type: string;
    performer?: string;
    caption?: string;
    description?: string;
}

export interface TranscriptReply {
    messageId: number;
    userId?: number;
    sender?: string;
    text?: string | null;
    attachments?: TranscriptAttachment[];
}

export interface TranscriptMessage {
    messageId: number;
    userId: number;
    sender: string;
    gender: string;
    time: string;
    text: string | null;
    replyTo?: TranscriptReply;
    attachments?: TranscriptAttachment[];
}
