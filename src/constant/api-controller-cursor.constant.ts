export const API_CONTROLLER_CURSOR_TIMESTAMP_PATTERN: RegExp = /^(?!0000)\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
export const API_CONTROLLER_CURSOR_TOKEN_MAX_LENGTH: number = 8192;
// Column types whose values are exact instants: pg binds them exactly as canonical UTC text, never as a Date.
export const API_CONTROLLER_TIMESTAMPTZ_COLUMN_TYPES: ReadonlySet<string> = new Set<string>(["timestamptz", "timestamp with time zone"]);
