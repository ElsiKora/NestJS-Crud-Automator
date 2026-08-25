import type { TApiPropertyDescribePropertiesBaseProperties } from "@type/decorator/api/property";

export type TApiPropertyDescribeBaseProperties = {
	isAutoDtoEnabled?: boolean;
	isNullable?: boolean;
	properties?: TApiPropertyDescribePropertiesBaseProperties;
};
