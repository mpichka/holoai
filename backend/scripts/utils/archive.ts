export function parseTgId(fromId: string): { tgId: number; isBot: boolean } | null {
    const userMatch = fromId.match(/^user(\d+)$/);
    if (userMatch) return { tgId: Number(userMatch[1]), isBot: false };

    // Threat messages sent from channels as bots, because we don't want to react to them
    const channelMatch = fromId.match(/^channel(\d+)$/);
    if (channelMatch) return { tgId: Number(channelMatch[1]), isBot: true };

    return null;
}

export function normalizeChatType(exportType: string): string {
    return exportType.replace(/^(public|private)_/, '');
}
