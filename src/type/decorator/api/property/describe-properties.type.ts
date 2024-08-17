import {
	EApiDtoType,
	EApiPropertyDataType,
	EApiPropertyDateType,
	EApiPropertyDescribeType,
	EApiRouteType
} from "../../../../enum";

export type TBasePropertyPropertiesDtoProperties = {
	required?: boolean;
	expose?: boolean;
	response?: boolean;
	enabled?: boolean;
}

type TBasePropertyPropertiesDto = {
	[key in EApiDtoType]?: TBasePropertyPropertiesDtoProperties;
}

type TBasePropertyProperties = {
	[key in EApiRouteType]?: TBasePropertyPropertiesDto;
}

type TBasePropertyType = {
	enum?: Record<string, number | string>;
	isArray?: boolean;
	nullable?: boolean;
	properties?: TBasePropertyProperties;
};

type TArrayProperties = {
	isArray: true;
	maxItems?: number;
	minItems?: number;
	uniqueItems?: boolean;
};

export type TUuidPropertyType = TBasePropertyType & {
	type: EApiPropertyDescribeType.UUID;
	description?: string;
} & Partial<TArrayProperties>;

export type TStringPropertyType = TBasePropertyType & {
	maxLength: number;
	minLength: number;
	example: string;
	description: string;
	type: EApiPropertyDescribeType.STRING;
	dataType: EApiPropertyDataType;
	format: EApiPropertyDataType;
	pattern: string;
} & Partial<TArrayProperties>;

export type TNumberPropertyType = TBasePropertyType & {
	maximum: number;
	minimum: number;
	example: string;
	description: string;
	multipleOf: number;
	type: EApiPropertyDescribeType.NUMBER;
	dataType: EApiPropertyDataType;
	format: EApiPropertyDataType;
} & Partial<TArrayProperties>;

export type TObjectPropertyType = TBasePropertyType & {
	nested?: boolean;
	description: string;
	type: EApiPropertyDescribeType.OBJECT;
} & Partial<TArrayProperties>;

export type TDatePropertyType = TBasePropertyType & {
	dataType: EApiPropertyDateType;
	type: EApiPropertyDescribeType.DATE;
} & Partial<TArrayProperties>;

export type TBooleanPropertyType = TBasePropertyType & {
	description: string;
	type: EApiPropertyDescribeType.BOOLEAN;
};

export type TApiPropertyDescribeProperties = TBooleanPropertyType | TDatePropertyType | TNumberPropertyType | TObjectPropertyType | TStringPropertyType | TUuidPropertyType;
