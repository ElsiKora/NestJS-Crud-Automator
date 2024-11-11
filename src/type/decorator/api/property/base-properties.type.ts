export type TApiPropertyBaseProperties<T> = {
	description?: string;
	entity: T;
	expose?: boolean;
	isArray?: boolean;
	maxItems?: number;
	minItems?: number;
	nullable?: boolean;
	required?: boolean;
	response?: boolean;
	uniqueItems?: boolean;
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
