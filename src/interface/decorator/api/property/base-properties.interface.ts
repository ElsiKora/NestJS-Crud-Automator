export interface IApiPropertyBaseProperties<T> {
	description?: string;
	entity: T;
	enum?: Record<string, number | string>;
	expose?: boolean;
	isArray?: boolean;
	maxItems?: number;
	minItems?: number;
	nullable?: boolean;
	required?: boolean;
	response?: boolean;
	uniqueItems?: boolean;
}
