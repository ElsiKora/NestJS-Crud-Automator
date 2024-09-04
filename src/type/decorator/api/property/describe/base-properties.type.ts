import type { TApiPropertyDescribePropertiesBaseProperties } from "./properties/base-properties.type";

export type TApiPropertyDescribeBaseProperties = {
	enum?: Record<string, number | string>;
	isArray?: boolean;
	nullable?: boolean;
	properties?: TApiPropertyDescribePropertiesBaseProperties;
};
