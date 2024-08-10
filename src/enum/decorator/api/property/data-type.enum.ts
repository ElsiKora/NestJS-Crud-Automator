export enum EApiPropertyDataType {
	BOOLEAN = "boolean",
	DATE = "date",
	DATE_TIME = "date-time",
	DOUBLE = "double",
	EMAIL = "email",
	FLOAT = "float",
	INTEGER = "integer",
	IP = "ip",
	LOWERCASE_STRING = "lowercase-string",
	NUMBER = "number",
	PASSWORD = "password",
	REGEXP = "regexp",
	STRING = "string",
	TEXT = "text",
	TIME = "time",
	UPPERCASE_STRING = "uppercase-string",
	URL = "url",
	UUID = "uuid",
}

export const EApiPropertyDataTypeString: Set<EApiPropertyDataType> = new Set<EApiPropertyDataType>([
	EApiPropertyDataType.STRING,
	EApiPropertyDataType.TEXT,
	EApiPropertyDataType.PASSWORD,
	EApiPropertyDataType.EMAIL,
	EApiPropertyDataType.URL,
	EApiPropertyDataType.UUID,
	EApiPropertyDataType.DATE,
	EApiPropertyDataType.DATE_TIME,
	EApiPropertyDataType.TIME,
	EApiPropertyDataType.UPPERCASE_STRING,
	EApiPropertyDataType.LOWERCASE_STRING,
	EApiPropertyDataType.REGEXP,
	EApiPropertyDataType.IP,
]);
export const EApiPropertyDataTypeNumber: Set<EApiPropertyDataType> = new Set<EApiPropertyDataType>([EApiPropertyDataType.NUMBER, EApiPropertyDataType.INTEGER, EApiPropertyDataType.FLOAT, EApiPropertyDataType.DOUBLE]);
export const EApiPropertyDataTypeBoolean: Set<EApiPropertyDataType> = new Set<EApiPropertyDataType>([EApiPropertyDataType.BOOLEAN]);
