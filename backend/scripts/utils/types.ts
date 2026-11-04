export interface ExportMessage {
    id: number;
    type: 'message' | 'service';
    date: string;
    date_unixtime: string;
    from?: string;
    from_id?: string;
    text?: string;
    text_entities?: unknown[];
    reply_to_message_id?: number;
    media_type?: string;
    file_size?: number;
    mime_type?: string;
    file_name?: string;
    duration_seconds?: number;
    performer?: string;
    photo?: string;
    photo_file_size?: number;
    file?: string;
    sticker_emoji?: string;
    forwarded_from?: string;
    forwarded_from_id?: string;
    via_bot?: string;
    [key: string]: unknown;
}

export interface ExportChat {
    name: string;
    type: string;
    id: number;
    messages: ExportMessage[];
}
