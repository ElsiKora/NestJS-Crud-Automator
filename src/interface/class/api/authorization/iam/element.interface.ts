import type { IApiAuthorizationIamQueryField } from "@interface/class/api/authorization/iam/query-field.interface";

/**
 * The column a query path reads on each row of the to-many relation it crosses, as `tags.name` reads `name` of every
 * related tag.
 */
export interface IApiAuthorizationIamElement {
	// The rest of the query path resolved on the related entity: a column of it, crossing no further relation.
	field: IApiAuthorizationIamQueryField;
	// The rest of the query path, relative to a related row, such as `name`.
	queryPath: string;
	// Query path of the to-many relation on the resource, such as `tags`.
	relationPath: string;
	// Entity class of the related rows.
	target: object;
}
