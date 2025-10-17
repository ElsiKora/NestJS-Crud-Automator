import type { EApiPropertyStringType } from "@enum/decorator/api/property";

export type TApiPropertyDefaultStringFormatProperties = {
	description: string;
	exampleValue: string;
	format: EApiPropertyStringType;
	maxLength: number;
	minLength: number;
	pattern: string;
};
