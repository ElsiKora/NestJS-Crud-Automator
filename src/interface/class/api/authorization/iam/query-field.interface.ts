import type { IApiAuthorizationIamColumn } from "@interface/class/api/authorization/iam/column.interface";
import type { IApiAuthorizationIamElement } from "@interface/class/api/authorization/iam/element.interface";

/**
 * A query path resolved through the TypeORM metadata of an IAM resource entity.
 */
export interface IApiAuthorizationIamQueryField {
	// Query path of the `OneToMany` or `ManyToMany` relation the path crosses, which makes the path unresolvable as one value.
	collectionPath?: string;
	// The column the path ends on, when the path is resolvable.
	column?: IApiAuthorizationIamColumn;
	// The column the path reads on each related row: set when the path crosses a to-many relation of the resource itself and then ends on a column of the related entity, which a qualified key compares as a set.
	element?: IApiAuthorizationIamElement;
	// Whether the column the path ends on holds a boolean.
	isBoolean: boolean;
	// Whether the path crosses a relation, so a row can lack it the way a loaded resource lacks the key.
	isOptional: boolean;
	// Whether the path ends on a column TypeORM maps.
	isResolvable: boolean;
	// Query path of the primary column of the last relation the path crosses: NULL exactly when that relation is missing.
	presencePath?: string;
}
