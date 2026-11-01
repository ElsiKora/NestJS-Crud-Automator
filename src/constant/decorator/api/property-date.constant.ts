import { EApiPropertyDateType } from "@enum/decorator/api/property/date/type.enum";

const PATTERN: Readonly<Record<EApiPropertyDateType, string>> = Object.freeze({
	[EApiPropertyDateType.DATE]: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$",
	[EApiPropertyDateType.DATE_TIME]: String.raw`^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$`,
	[EApiPropertyDateType.TIME]: "^[0-9]{2}:[0-9]{2}:[0-9]{2}$",
});

const TEMPLATE: Readonly<Record<EApiPropertyDateType, string>> = Object.freeze({
	[EApiPropertyDateType.DATE]: "YYYY-MM-DD",
	[EApiPropertyDateType.DATE_TIME]: "YYYY-MM-DDTHH:mm:ss.sssZ",
	[EApiPropertyDateType.TIME]: "HH:mm:ss",
});

export const PROPERTY_DATE_DECORATOR_API_CONSTANT: {
	readonly PATTERN: Readonly<Record<EApiPropertyDateType, string>>;
	readonly TEMPLATE: Readonly<Record<EApiPropertyDateType, string>>;
} = {
	PATTERN,
	TEMPLATE,
} as const;
