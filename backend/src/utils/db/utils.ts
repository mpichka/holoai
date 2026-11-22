/** Converts nullable database values to optional model fields. */
export const optional = <T>(value: T | null): T | undefined => value ?? undefined;
