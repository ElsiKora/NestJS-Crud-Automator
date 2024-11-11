import type { TApiPropertyDescribePropertiesBaseProperties } from "./properties/base-properties.type";

export type TApiPropertyDescribeBaseProperties = {
	isArray?: boolean;
	nullable?: boolean;
	properties?: TApiPropertyDescribePropertiesBaseProperties;
} & (
	| {
			enum: Record<string, number | string>;
			enumName: string;
	  }
	| {
			enum?: undefined;
			enumName?: string;
	  }
);
