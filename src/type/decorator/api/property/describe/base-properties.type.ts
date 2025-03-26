import type { TApiPropertyDescribePropertiesBaseProperties } from "@type/decorator/api/property";

export type TApiPropertyDescribeBaseProperties = {
	isNullable?: boolean;
	properties?: TApiPropertyDescribePropertiesBaseProperties;
};
