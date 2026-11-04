import type { IApiAuthorizationIamColumn, IApiAuthorizationIamQueryField } from "@interface/class/api/authorization";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";
import type { TTypeOrmColumnMetadataArguments, TTypeOrmEmbeddedMetadataArguments, TTypeOrmMetadataArgumentsStorage, TTypeOrmRelationMetadataArguments } from "@type/utility/typeorm";

import { MetadataStorage } from "@class/metadata-storage.class";
import { AUTHORIZATION_IAM_COLUMN_FAMILY_CONSTANT } from "@constant/class/authorization";
import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { EApiAuthorizationIamColumnFamily } from "@enum/class/authorization";
import { EApiPropertyDescribeType } from "@enum/decorator/api";
import { GetClassHierarchy } from "@utility/get/class-hierarchy.utility";
import { IsEntityConstructor } from "@utility/is/entity/constructor.utility";
import { ResolveRelationTarget } from "@utility/resolve/relation-target.utility";
import { getMetadataArgsStorage } from "typeorm";

// TypeORM column types that hold a boolean: `Boolean` comes from a `boolean` property without an explicit type, and `bit` is the SQL Server boolean.
const authorizationIamQueryFieldBooleanColumnTypes: ReadonlySet<unknown> = new Set<unknown>(["bit", "bool", Boolean, "boolean"]);

// Column modes TypeORM fills with a date when the decorator names no type.
const authorizationIamQueryFieldDateModes: ReadonlySet<string> = new Set<string>(["createDate", "deleteDate", "updateDate"]);

// Relations that hold several rows: a path through one has no single value to compare.
const authorizationIamQueryFieldCollectionRelationTypes: ReadonlySet<string> = new Set<string>(["many-to-many", "one-to-many"]);

/**
 * Walks an IAM `queryPath` through the TypeORM metadata of the resource entity: relations of any depth, embedded properties,
 * and columns declared on parent classes. The column the path ends on is a boolean when its TypeORM type holds one or
 * its `@ApiPropertyDescribe` type is `BOOLEAN`, so a boolean column without describe metadata counts too, and so does `bit`, the SQL Server boolean.
 * A path that crosses a to-one relation is optional, and its presence path names the primary column of the last relation
 * it crosses: the scope joins relations with LEFT JOIN, so that column is NULL exactly when the path is missing.
 * A path that crosses a `OneToMany` or `ManyToMany` relation is not resolvable and names that relation in `collectionPath`:
 * the in-memory evaluator reads a list there, and SQL compares each joined row, so no comparison means the same in both.
 * A path that ends before a column, or names a property TypeORM does not map, is not resolvable. So is every path of a
 * resource entity that no TypeORM decorator maps, such as one registered only through an `EntitySchema`: its column types
 * cannot be read, so its scope fails closed instead of binding values as text.
 * A resolvable path also carries `column`: the family, declared type and collation, transformer, nullability and primary
 * flag of the column it ends on, from which the planner and the dialect lowerers decide which comparisons are exact.
 * @param {object} entity - Resource entity class.
 * @param {string} queryPath - Entity query path such as `isActive`, `owner.company.isVerified` or `meta.isLocked`.
 * @returns {IApiAuthorizationIamQueryField} The resolved query path.
 */
export function AuthorizationIamReadQueryField(entity: object, queryPath: string): IApiAuthorizationIamQueryField {
	const storage: TTypeOrmMetadataArgumentsStorage = getMetadataArgsStorage();
	const segments: Array<string> = queryPath.split(".");

	if (!GetClassHierarchy(entity).some((entityClass: object): boolean => storage.tables.some(({ target }: { target: unknown }): boolean => target === entityClass))) {
		return { isBoolean: false, isOptional: false, isResolvable: false };
	}

	let isOptional: boolean = false;
	let presencePath: string | undefined;
	let target: object | undefined = entity;

	for (const [index, segment] of segments.entries()) {
		const hierarchy: Array<new () => unknown> = GetClassHierarchy(target);
		const column: TTypeOrmColumnMetadataArguments | undefined = storage.filterColumns(hierarchy).find((candidate: TTypeOrmColumnMetadataArguments): boolean => candidate.propertyName === segment);

		if (column) {
			if (index !== segments.length - 1 || !hierarchy[0]) {
				break;
			}

			const metadata: Partial<TApiPropertyDescribeProperties> | undefined = MetadataStorage.getInstance().getMetadata(hierarchy[0], segment, PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY);
			const isBoolean: boolean = authorizationIamQueryFieldBooleanColumnTypes.has(column.options.type) || metadata?.type === EApiPropertyDescribeType.BOOLEAN;

			return { column: AuthorizationIamReadColumn(column, isBoolean), isBoolean, isOptional, isResolvable: true, ...(presencePath === undefined ? {} : { presencePath }) };
		}

		const relation: TTypeOrmRelationMetadataArguments | undefined = storage.filterRelations(hierarchy).find((candidate: TTypeOrmRelationMetadataArguments): boolean => candidate.propertyName === segment);

		if (relation && authorizationIamQueryFieldCollectionRelationTypes.has(relation.relationType)) {
			return { collectionPath: segments.slice(0, index + 1).join("."), isBoolean: false, isOptional: false, isResolvable: false };
		}

		target = AuthorizationIamResolveNestedTarget(storage, hierarchy, segment);

		if (!target) {
			break;
		}

		if (relation) {
			const primaryColumn: TTypeOrmColumnMetadataArguments | undefined = storage.filterColumns(GetClassHierarchy(target)).find((candidate: TTypeOrmColumnMetadataArguments): boolean => candidate.options.primary === true);

			isOptional = true;
			// Without a primary column a missing relation cannot be told apart from a NULL column, so IfExists keys on the path fail closed.
			presencePath = primaryColumn ? [...segments.slice(0, index + 1), primaryColumn.propertyName].join(".") : undefined;
		}
	}

	return { isBoolean: false, isOptional: false, isResolvable: false };
}

/**
 * Reads what the planner needs of the column a query path ends on from its TypeORM decorator arguments: the column
 * family, nullability, list and JSON storage, a declared collation, and a value transformer. A `createDate`,
 * `updateDate` or `deleteDate` column without a named type holds a date, and a `version` column a number.
 * @param {TTypeOrmColumnMetadataArguments} column - Decorator arguments of the column.
 * @param {boolean} isBoolean - Whether the column holds a boolean by its TypeORM type or its describe metadata.
 * @returns {IApiAuthorizationIamColumn} The column.
 */
function AuthorizationIamReadColumn(column: TTypeOrmColumnMetadataArguments, isBoolean: boolean): IApiAuthorizationIamColumn {
	const declaredType: unknown = column.options.type;
	const type: string | undefined = typeof declaredType === "string" ? declaredType.trim().toLowerCase() : undefined;
	const isPrimary: boolean = column.options.primary === true;
	let family: EApiAuthorizationIamColumnFamily = AUTHORIZATION_IAM_COLUMN_FAMILY_CONSTANT.TYPES.get(type ?? declaredType) ?? EApiAuthorizationIamColumnFamily.OTHER;

	if (declaredType === undefined && authorizationIamQueryFieldDateModes.has(column.mode)) {
		family = EApiAuthorizationIamColumnFamily.DATE;
	} else if (declaredType === undefined && column.mode === "version") {
		family = EApiAuthorizationIamColumnFamily.NUMERIC;
	}

	if (column.options.array === true) {
		family = EApiAuthorizationIamColumnFamily.ARRAY;
	} else if (isBoolean) {
		family = EApiAuthorizationIamColumnFamily.BOOLEAN;
	}

	const enumValues: ReadonlyArray<string> | undefined = family === EApiAuthorizationIamColumnFamily.ENUM ? AuthorizationIamReadEnumValues(column.options.enum) : undefined;

	return {
		...(typeof column.options.collation === "string" ? { collation: column.options.collation } : {}),
		...(enumValues === undefined ? {} : { enumValues }),
		family,
		hasTransformer: column.options.transformer !== undefined,
		isArray: family === EApiAuthorizationIamColumnFamily.ARRAY,
		...(authorizationIamQueryFieldDateModes.has(column.mode) ? { isAutoDate: true } : {}),
		isJson: family === EApiAuthorizationIamColumnFamily.JSON,
		isNullable: column.options.nullable === true && !isPrimary,
		isPrimary,
		...(typeof column.options.precision === "number" ? { precision: column.options.precision } : {}),
		...(type === undefined ? {} : { type }),
	};
}

/**
 * Reads the values an enum column declares, the way TypeORM reads its `enum` option: a list as it is, and of an enum
 * object the values of its non-numeric keys that are not functions, since a numeric TypeScript enum also maps each
 * number back to its name. Each value is read as the text the database stores.
 * @param {unknown} declared - The `enum` option of the column decorator.
 * @returns {ReadonlyArray<string> | undefined} The text of each declared value, or undefined when the option declares none.
 */
function AuthorizationIamReadEnumValues(declared: unknown): ReadonlyArray<string> | undefined {
	if (Array.isArray(declared)) {
		return declared.length > 0 ? declared.map(String) : undefined;
	}

	if (!declared || typeof declared !== "object") {
		return undefined;
	}

	const record: Record<string, unknown> = declared as Record<string, unknown>;

	const values: Array<string> = Object.keys(record)
		.filter((key: string): boolean => Number.isNaN(Number(key)) && typeof record[key] !== "function")
		.map((key: string): string => String(record[key]));

	return values.length > 0 ? values : undefined;
}

/**
 * Resolves the class one path segment leads to: the type of an embedded property, or the entity a relation targets.
 * @param {TTypeOrmMetadataArgumentsStorage} storage - TypeORM decorator metadata.
 * @param {Array<new () => unknown>} hierarchy - The current class and its parent classes.
 * @param {string} segment - Property name of the segment.
 * @returns {object | undefined} The next class, or undefined when the segment is neither an embedded property nor a relation to an entity.
 */
function AuthorizationIamResolveNestedTarget(storage: TTypeOrmMetadataArgumentsStorage, hierarchy: Array<new () => unknown>, segment: string): object | undefined {
	const embedded: TTypeOrmEmbeddedMetadataArguments | undefined = storage.filterEmbeddeds(hierarchy).find((candidate: TTypeOrmEmbeddedMetadataArguments): boolean => candidate.propertyName === segment);

	if (embedded) {
		const embeddedType: unknown = embedded.type();

		return IsEntityConstructor(embeddedType) ? embeddedType : undefined;
	}

	const relation: TTypeOrmRelationMetadataArguments | undefined = storage.filterRelations(hierarchy).find((candidate: TTypeOrmRelationMetadataArguments): boolean => candidate.propertyName === segment);

	if (!relation) {
		return undefined;
	}

	let relationType: unknown = relation.type;

	try {
		relationType = (relation.type as () => unknown)();
	} catch {
		// The relation names its target class or entity name directly.
	}

	try {
		return ResolveRelationTarget(typeof relationType === "string" ? { name: relationType } : (relationType as object));
	} catch {
		// A name that matches several entity classes cannot be resolved, so the path does not compile.
		return undefined;
	}
}
