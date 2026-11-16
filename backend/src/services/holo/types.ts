export type Command = {
    category: string;
    type?: string;
    args?: unknown;
};

export type SummarizeScope = { mode: 'count'; count: number } | { mode: 'range'; from: number; to: number };

export interface ChatSummaryMetadata {
    messagesCount: number;
    attachmentsCount: Record<string, number>;
    audioDuration: number;
    videoDuration: number;
    estimate: number;
}
