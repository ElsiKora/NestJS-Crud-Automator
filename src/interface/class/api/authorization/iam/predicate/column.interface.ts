import type { IApiAuthorizationIamQueryField } from "@interface/class/api/authorization/iam/query-field.interface";

/**
 * The column an IAM predicate atom reads: its entity query path and what TypeORM metadata says about it.
 */
export interface IApiAuthorizationIamPredicateColumn {
	// The query path resolved through the TypeORM metadata of the resource entity.
	field: IApiAuthorizationIamQueryField;
	// Entity query path, such as `status` or `owner.company.id`.
	queryPath: string;
}
