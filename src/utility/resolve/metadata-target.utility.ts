import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TMetadataStorageTarget } from "@type/class";

import { ErrorException } from "@utility/error/exception.utility";
import { getMetadataArgsStorage, InstanceChecker } from "typeorm";

/**
 * Resolves an entity reference to the class MetadataStorage keys its metadata by.
 * A class is returned as is. An EntitySchema resolves to its `target` class. A `{ name }` reference resolves through
 * TypeORM entity metadata to the one entity class with that name; a name that matches no class or several classes fails.
 * @param {IApiBaseEntity} entity - Entity class, EntitySchema, or `{ name }` reference.
 * @returns {TMetadataStorageTarget} The entity class.
 * @throws {Error} When the reference does not resolve to exactly one class.
 */
export function ResolveMetadataTarget(entity: IApiBaseEntity): TMetadataStorageTarget {
	if (typeof entity === "function") {
		return entity as unknown as TMetadataStorageTarget;
	}

	let name: unknown = Reflect.get(entity, "name");

	if (InstanceChecker.isEntitySchema(entity)) {
		if (typeof entity.options.target === "function") {
			return entity.options.target as unknown as TMetadataStorageTarget;
		}

		name = entity.options.name;
	}

	if (typeof name !== "string" || !name) {
		throw ErrorException("Metadata target has neither a class nor a name. Pass the entity class.");
	}

	const candidates: Set<TMetadataStorageTarget> = new Set<TMetadataStorageTarget>();

	for (const { target } of getMetadataArgsStorage().tables) {
		if (typeof target === "function" && target.name === name) {
			candidates.add(target as unknown as TMetadataStorageTarget);
		}
	}

	const [candidate]: Array<TMetadataStorageTarget> = [...candidates];

	if (!candidate) {
		throw ErrorException(`Metadata target "${name}" does not match an entity class in TypeORM metadata. Pass the entity class.`);
	}

	if (candidates.size > 1) {
		throw ErrorException(`Metadata target "${name}" matches ${String(candidates.size)} entity classes in TypeORM metadata. Pass the entity class instead of its name.`);
	}

	return candidate;
}
