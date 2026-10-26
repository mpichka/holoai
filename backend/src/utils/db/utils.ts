export const mapToAlias = (table: string, prefix: string, cols: string[] | readonly string[]) =>
    cols.map((c) => `${table}.${c} as ${prefix}${c}`);

export const pickFromAlias = <T>(row: Record<string, unknown>, prefix: string, cols: string[] | readonly string[]): T =>
    Object.fromEntries(cols.map((c) => [c, row[prefix + c]])) as T;
