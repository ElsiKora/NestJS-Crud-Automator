import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TMetadataStorageTarget } from "@type/class";

import { ErrorException } from "@utility/error/exception.utility";
import { GetEntityTableName } from "@utility/get/entity-table-name.utility";
import { IsEntityConstructor } from "@utility/is/entity/constructor.utility";
import { getMetadataArgsStorage, InstanceChecker } from "typeorm";

/**
 * Resolves an entity reference to the class MetadataStorage keys its metadata by.
 * A class is returned as is. An EntitySchema resolves to its `target` class, and one without a `target` class fails. A `{ name }` reference resolves to the one
 * class registered with that name by the `@Entity` decorator (`getMetadataArgsStorage().tables`), not through the entity
 * metadata of a DataSource; a name that matches no class or several classes fails.
 * @param {IApiBaseEntity} entity - Entity class, EntitySchema, or `{ name }` reference.
 * @returns {TMetadataStorageTarget} The entity class.
 * @throws {Error} When the reference does not resolve to exactly one class.
 */
export function ResolveMetadataTarget(entity: IApiBaseEntity): TMetadataStorageTarget {
	if (IsEntityConstructor(entity)) {
		return entity;
	}

	if (InstanceChecker.isEntitySchema(entity)) {
		if (IsEntityConstructor(entity.options.target)) {
			return entity.options.target;
		}

		throw ErrorException(`Metadata target "${entity.options.name}" does not match an entity class in TypeORM metadata. Pass the entity class.`);
	}

	const name: unknown = Reflect.get(entity, "name");

	if (typeof name !== "string" || !name) {
		throw ErrorException("Metadata target has neither a class nor a name. Pass the entity class.");
	}

	const candidates: Set<TMetadataStorageTarget> = new Set<TMetadataStorageTarget>();

	for (const { target } of getMetadataArgsStorage().tables) {
		if (IsEntityConstructor(target) && target.name === name) {
			candidates.add(target);
		}
	}

	const [candidate]: Array<TMetadataStorageTarget> = [...candidates];

	if (!candidate) {
		throw ErrorException(`Metadata target "${name}" does not match an entity class in TypeORM metadata. Pass the entity class.`);
	}

	if (candidates.size > 1) {
		const tables: Array<string> = [...candidates].map((target: TMetadataStorageTarget): string => GetEntityTableName(target));

		throw ErrorException(`Metadata target "${name}" matches ${String(candidates.size)} entity classes in TypeORM metadata (tables ${tables.slice(0, -1).join(", ")} and ${String(tables.at(-1))}). Pass the entity class instead of its name.`);
	}

	return candidate;
}
