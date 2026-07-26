import type { ITypedQueryOwner } from "./owner.interface";
import type { ITypedQueryTag } from "./tag.interface";

export interface ITypedQueryEntity {
	count: number;
	enabled: boolean;
	id: string;
	name: string;
	nullableName?: null | string;
	owner: ITypedQueryOwner;
	tags: Array<ITypedQueryTag>;
}
