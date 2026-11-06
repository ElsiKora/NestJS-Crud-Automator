import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { Type } from "@nestjs/common";
import type { TTypeOrmMetadataArgumentsStorage, TTypeOrmRelationMetadataArguments } from "@type/utility/typeorm";
import type { DeepPartial } from "typeorm";

import { EErrorStringAction } from "@enum/utility";
import { EApiExceptionDetailsType } from "@enum/utility/exception-details-type.enum";
import { BadRequestException, HttpStatus } from "@nestjs/common";
import { DatabaseTypeOrmGetChildEntities } from "@utility/database/typeorm/get/child-entities.utility";
import { ErrorString } from "@utility/error/string.utility";
import { GetClassHierarchy } from "@utility/get/class-hierarchy.utility";
import { getMetadataArgsStorage } from "typeorm";

/** To-many paths per route entity class, split into segments, with the TypeORM table, relation and embedded column counts they were read at. */
const TO_MANY_PATHS_BY_ENTITY: WeakMap<IApiBaseEntity, { embeddedCount: number; paths: ReadonlyArray<ReadonlyArray<string>>; relationCount: number; tableCount: number }> = new WeakMap<IApiBaseEntity, { embeddedCount: number; paths: ReadonlyArray<ReadonlyArray<string>>; relationCount: number; tableCount: number }>();

/**
 * Rejects an UPDATE or PARTIAL_UPDATE body, generated or custom, that carries a to-many relation key, `null` included.
 * TypeORM saves such a value as the full new set, so the rule reads the TypeORM relations of the entity, its parent classes,
 * its embedded columns at any depth, and every `@ChildEntity` that extends it. It ignores `relations.request` and its include.
 * @param {IApiBaseEntity} entity - Entity class of the route.
 * @param {DeepPartial<E> | Partial<E> | undefined} body - Request body after route BEFORE subscribers.
 * @throws {BadRequestException} When the body has a to-many relation key whose value is not undefined; `propertyName` is its dotted path
 * @template E - The entity type
 */
export function ApiControllerRejectToManyUpdateKeys<E extends IApiBaseEntity>(entity: IApiBaseEntity, body: DeepPartial<E> | Partial<E> | undefined): void {
	if (!body) {
		return;
	}

	for (const path of getToManyPaths(entity)) {
		if (!isPathPresent(body, path)) {
			continue;
		}

		throw new BadRequestException({
			details: {
				propertyName: path.join("."),
				type: EApiExceptionDetailsType.TO_MANY_UPDATE_KEY,
			},
			error: "Bad Request",
			message: ErrorString({ entity, type: EErrorStringAction.REFERENCE_NOT_VALID }),
			statusCode: HttpStatus.BAD_REQUEST,
		});
	}
}

/**
 * Adds the dotted paths of every one-to-many and many-to-many relation declared on a class, its parents and its embedded columns.
 * @param {unknown} target - Entity or embedded class.
 * @param {Array<string>} prefix - Property path of the embedded column that holds the class.
 * @param {Set<unknown>} visiting - Embedded classes on the current path, so a self-referencing embedded stops.
 * @param {Set<string>} paths - Collected paths.
 */
function collectToManyPaths(target: unknown, prefix: Array<string>, visiting: Set<unknown>, paths: Set<string>): void {
	if (visiting.has(target)) {
		return;
	}

	const hierarchy: Array<Type<unknown>> = GetClassHierarchy(target);

	visiting.add(target);

	for (const relation of getMetadataArgsStorage().filterRelations(hierarchy)) {
		if (isToManyRelation(relation)) {
			paths.add([...prefix, relation.propertyName].join("."));
		}
	}

	for (const embedded of getMetadataArgsStorage().filterEmbeddeds(hierarchy)) {
		collectToManyPaths(embedded.type(), [...prefix, embedded.propertyName], visiting, paths);
	}

	visiting.delete(target);
}

/**
 * Returns the to-many paths of an entity class and every `@ChildEntity` that extends it, cached per class.
 * The cache is read again when TypeORM has registered a table, a relation or an embedded column since, such as a child entity imported after the first request.
 * @param {IApiBaseEntity} entity - Entity class of the route.
 * @returns {ReadonlyArray<ReadonlyArray<string>>} Property paths split into segments.
 */
function getToManyPaths(entity: IApiBaseEntity): ReadonlyArray<ReadonlyArray<string>> {
	const storage: TTypeOrmMetadataArgumentsStorage = getMetadataArgsStorage();
	const cached: { embeddedCount: number; paths: ReadonlyArray<ReadonlyArray<string>>; relationCount: number; tableCount: number } | undefined = TO_MANY_PATHS_BY_ENTITY.get(entity);

	if (cached?.embeddedCount === storage.embeddeds.length && cached.relationCount === storage.relations.length && cached.tableCount === storage.tables.length) {
		return cached.paths;
	}

	const toManyPaths: Set<string> = new Set<string>();

	for (const target of [entity, ...DatabaseTypeOrmGetChildEntities(entity)]) {
		collectToManyPaths(target, [], new Set<unknown>(), toManyPaths);
	}

	const paths: ReadonlyArray<ReadonlyArray<string>> = [...toManyPaths].map((path: string): ReadonlyArray<string> => path.split("."));

	TO_MANY_PATHS_BY_ENTITY.set(entity, { embeddedCount: storage.embeddeds.length, paths, relationCount: storage.relations.length, tableCount: storage.tables.length });

	return paths;
}

/**
 * Checks whether a body holds a value other than undefined at a property path; an array on the path is checked element by element.
 * @param {unknown} value - Body or nested body value.
 * @param {ReadonlyArray<string>} path - Remaining property path segments.
 * @returns {boolean} True when some value at the path is present.
 */
function isPathPresent(value: unknown, path: ReadonlyArray<string>): boolean {
	if (Array.isArray(value)) {
		return value.some((item: unknown): boolean => isPathPresent(item, path));
	}

	if (value === null || typeof value !== "object") {
		return false;
	}

	const segment: string = path[0] ?? "";
	const rest: Array<string> = path.slice(1);

	if (!Object.prototype.hasOwnProperty.call(value, segment)) {
		return false;
	}

	const next: unknown = (value as Record<string, unknown>)[segment];

	return rest.length === 0 ? next !== undefined : isPathPresent(next, rest);
}

/**
 * Checks whether TypeORM relation metadata describes a one-to-many or many-to-many relation.
 * @param {TTypeOrmRelationMetadataArguments} relation - TypeORM relation metadata.
 * @returns {boolean} True for a to-many relation.
 */
function isToManyRelation(relation: TTypeOrmRelationMetadataArguments): boolean {
	return relation.relationType === "one-to-many" || relation.relationType === "many-to-many";
}
