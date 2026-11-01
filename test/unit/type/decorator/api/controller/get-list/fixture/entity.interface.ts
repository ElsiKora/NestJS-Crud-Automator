import type { ITypedQueryOwner } from "./owner.interface";
import type { ITypedQueryTag } from "./tag.interface";

export interface ITypedQueryEntity {
	amount: string;
	count: number;
	enabled: boolean;
	id: string;
	name: string;
	nullableName?: null | string;
	occurredOn: Date;
	owner: ITypedQueryOwner;
	releasedOn: string;
	tags: Array<ITypedQueryTag>;
}
