export function ftsMatchQuery(query: string): string {
    const terms = query.split(/[^\p{L}\p{N}_]+/u).filter((term) => term.length > 0);

    if (terms.length === 0) {
        // No usable terms (e.g. punctuation-only input) — match nothing
        // rather than letting an empty MATCH throw its own syntax error.
        return '""';
    }

    return terms.map((term) => `"${term}"`).join(' OR ');
}
