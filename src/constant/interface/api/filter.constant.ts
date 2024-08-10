
const ALLOWED_ENTITY_TO_FILTER_COLUMNS: string[] = [
    'string', 'text', 'varchar', 'char',
    'number', 'int', 'integer', 'tinyint', 'smallint', 'mediumint', 'bigint', 'float', 'double', 'decimal',
    'date', 'datetime', 'timestamp'
];

export const API_FILTER_INTERFACE_CONSTANT: {
    readonly ALLOWED_ENTITY_TO_FILTER_COLUMNS: string[];
} = {
    ALLOWED_ENTITY_TO_FILTER_COLUMNS,
} as const;
