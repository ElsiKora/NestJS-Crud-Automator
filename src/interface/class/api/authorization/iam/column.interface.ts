import type { EApiAuthorizationIamColumnFamily } from "@enum/class/authorization";

/**
 * The column an IAM query path ends on, as its TypeORM decorator declares it.
 */
export interface IApiAuthorizationIamColumn {
	// Collation the column declares, when it declares one.
	collation?: string;
	// What the column holds.
	family: EApiAuthorizationIamColumnFamily;
	// Whether the column declares a TypeORM value transformer, which `Raw` conditions bypass.
	hasTransformer: boolean;
	// Whether the column holds a list: `array: true`, `simple-array`, or a MySQL `set`.
	isArray: boolean;
	// Whether the column holds a JSON document.
	isJson: boolean;
	// Whether the column accepts NULL; a primary column never does.
	isNullable: boolean;
	// Whether the column is a primary column of its entity.
	isPrimary: boolean;
	// Column type the decorator names, in lower case, such as `varchar` or `timestamptz`; absent when TypeORM takes it from the property type.
	type?: string;
}
