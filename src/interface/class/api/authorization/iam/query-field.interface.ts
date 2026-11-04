import type { IApiAuthorizationIamColumn } from "@interface/class/api/authorization/iam/column.interface";

/**
 * A query path resolved through the TypeORM metadata of an IAM resource entity.
 */
export interface IApiAuthorizationIamQueryField {
	// Query path of the `OneToMany` or `ManyToMany` relation the path crosses, which makes the path unresolvable.
	collectionPath?: string;
	// The column the path ends on, when the path is resolvable.
	column?: IApiAuthorizationIamColumn;
	// Whether the column the path ends on holds a boolean.
	isBoolean: boolean;
	// Whether the path crosses a relation, so a row can lack it the way a loaded resource lacks the key.
	isOptional: boolean;
	// Whether the path ends on a column TypeORM maps.
	isResolvable: boolean;
	// Query path of the primary column of the last relation the path crosses: NULL exactly when that relation is missing.
	presencePath?: string;
}
