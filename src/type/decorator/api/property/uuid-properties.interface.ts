export type TApiPropertyUuidProperties<T> = {
	description?: string;
	entity: T;
	expose?: boolean;
	nullable?: boolean;
	required?: boolean;
	response?: boolean;
}
