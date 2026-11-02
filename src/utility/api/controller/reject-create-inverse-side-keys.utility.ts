import type { TTypeOrmColumnMetadataArguments, TTypeOrmRelationMetadataArguments } from "@type/utility/typeorm";

import { ApiRequestValidationException } from "@class/api/request-validation-exception.class";
import { DatabaseTypeOrmIsInverseSideRelation } from "@utility/database/typeorm/is/inverse-side-relation.utility";
import { GetClassHierarchy } from "@utility/get/class-hierarchy.utility";
import { ValidationError } from "class-validator";
import { getMetadataArgsStorage } from "typeorm";

/**
 * Rejects a CREATE body, generated or custom, that references existing rows through a `OneToMany` or inverse `OneToOne` relation.
 * The generated CREATE body does not declare such a relation, because a create only inserts and binding an existing row writes that row.
 * A reference is a key value, or an object that holds only primary key properties of the related entity, alone or in an array.
 * A new related row with its own values is left to the create, which inserts it, or answers 409 when its key already exists.
 * The key answers the `400` a `ValidationPipe` with `forbidNonWhitelisted` gives an undeclared property, with or without such a pipe.
 * @param {unknown} entity - Entity class of the route.
 * @param {unknown} body - Request body after route BEFORE subscribers.
 * @throws {ApiRequestValidationException} With one `whitelistValidation` failure per relation key that holds a reference
 */
export function ApiControllerRejectCreateInverseSideKeys(entity: unknown, body: unknown): void {
	if (body === null || typeof body !== "object") {
		return;
	}

	const record: Record<string, unknown> = body as Record<string, unknown>;

	const errors: Array<ValidationError> = getMetadataArgsStorage()
		.filterRelations(GetClassHierarchy(entity))
		.filter(({ propertyName }: TTypeOrmRelationMetadataArguments): boolean => Object.prototype.hasOwnProperty.call(record, propertyName) && DatabaseTypeOrmIsInverseSideRelation(entity, propertyName))
		.filter((relation: TTypeOrmRelationMetadataArguments): boolean => {
			const value: unknown = record[relation.propertyName];
			const primaryNames: ReadonlySet<string> = getPrimaryNames(relation);

			return (Array.isArray(value) ? value : [value]).some((item: unknown): boolean => isReference(item, primaryNames));
		})
		.map(({ propertyName }: TTypeOrmRelationMetadataArguments): ValidationError => Object.assign(new ValidationError(), { children: [], constraints: { whitelistValidation: `property ${propertyName} should not exist` }, property: propertyName }));

	if (errors.length > 0) {
		throw new ApiRequestValidationException(errors);
	}
}

/**
 * Lists the primary key properties of the related entity, read from the TypeORM decorator metadata, or `id` when the related class cannot be resolved.
 * @param {TTypeOrmRelationMetadataArguments} relation - Relation metadata.
 * @returns {ReadonlySet<string>} Primary key property names.
 */
function getPrimaryNames(relation: TTypeOrmRelationMetadataArguments): ReadonlySet<string> {
	const related: unknown = typeof relation.type === "function" ? (relation.type as () => unknown)() : undefined;

	const names: Array<string> = getMetadataArgsStorage()
		.filterColumns(GetClassHierarchy(related))
		.filter((column: TTypeOrmColumnMetadataArguments): boolean => column.options.primary === true)
		.map((column: TTypeOrmColumnMetadataArguments): string => column.propertyName);

	return new Set<string>(names.length > 0 ? names : ["id"]);
}

/**
 * Tells whether a related value names an existing row instead of describing a new one.
 * @param {unknown} value - One related value from the body.
 * @param {ReadonlySet<string>} primaryNames - Primary key properties of the related entity.
 * @returns {boolean} Whether the value is a key value or an object with only primary key properties.
 */
function isReference(value: unknown, primaryNames: ReadonlySet<string>): boolean {
	if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") {
		return true;
	}

	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return false;
	}

	const keys: Array<string> = Object.keys(value);

	return keys.length > 0 && keys.every((key: string): boolean => primaryNames.has(key));
}
