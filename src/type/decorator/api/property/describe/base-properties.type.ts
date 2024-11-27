import type { TApiPropertyDescribePropertiesBaseProperties } from "./properties/base-properties.type";

export type TApiPropertyDescribeBaseProperties = {
	isNullable?: boolean;
	properties?: TApiPropertyDescribePropertiesBaseProperties;
};
