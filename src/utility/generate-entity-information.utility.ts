import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
import type { Type } from "@nestjs/common";
import type { TApiEntityReference } from "@type/api-entity-reference.type";
import type { TMetadataStorageTarget } from "@type/class";
import type { TTypeOrmColumnMetadataArguments, TTypeOrmRelationMetadataArguments, TTypeOrmTableMetadataArguments } from "@type/utility/typeorm";

import { MetadataStorage } from "@class/metadata-storage.class";
import { ErrorException } from "@utility/error/exception.utility";
import { GetClassHierarchy } from "@utility/get/class-hierarchy.utility";
import { ResolveMetadataTarget } from "@utility/resolve/metadata-target.utility";
import { DefaultNamingStrategy, getMetadataArgsStorage } from "typeorm";

/**
 * Generates metadata information about an entity including columns, table name, and primary key
 * @param {TApiEntityReference} entity - The entity to generate information for
 * @returns {IApiEntity<E>} The generated entity information object
 * @template E - The entity type
 */
export function GenerateEntityInformation<E>(entity: TApiEntityReference): IApiEntity<E> {
	const tableName: string = ((): string => {
		// eslint-disable-next-line @elsikora/typescript/no-unsafe-function-type
		const table: TTypeOrmTableMetadataArguments | undefined = getMetadataArgsStorage().tables.find(({ target }: TTypeOrmTableMetadataArguments): boolean => (target as Function).name === entity.name);

		if (!table) {
			throw ErrorException(`Table for entity ${String(entity.name)} not found in metadata storage`);
		}

		if (table.type !== "entity-child") {
			return new DefaultNamingStrategy().tableName(entity.name ?? "UnknownResource", table.name);
		}

		for (const ancestor of GetClassHierarchy(table.target).slice(1)) {
			const parentTable: TTypeOrmTableMetadataArguments | undefined = getMetadataArgsStorage().tables.find(({ target }: TTypeOrmTableMetadataArguments): boolean => target === ancestor);

			if (parentTable && parentTable.type !== "entity-child") {
				return new DefaultNamingStrategy().tableName(ancestor.name, parentTable.name);
			}
		}

		throw ErrorException(`Table inheritance root for child entity ${String(entity.name)} not found in metadata storage`);
	})();

	const storage: MetadataStorage = MetadataStorage.getInstance();
	const metadataTarget: TMetadataStorageTarget = ResolveMetadataTarget(entity);
	const entityHierarchy: Array<Type<unknown>> = GetClassHierarchy(entity);
	const entityNames: Array<string> = entityHierarchy.map((current: Type<unknown>): string => current.name);

	if (entityHierarchy.length === 0 && entity.name) {
		entityNames.push(entity.name);
	}

	const columnList: Array<TTypeOrmColumnMetadataArguments> = getMetadataArgsStorage().columns.filter(({ target }: TTypeOrmColumnMetadataArguments): boolean => {
		if (typeof target === "string") {
			return entityNames.includes(target);
		}

		if (typeof target !== "function") {
			return false;
		}

		const targetEntity: new (...arguments_: Array<unknown>) => unknown = target as unknown as new (...arguments_: Array<unknown>) => unknown;

		return entityHierarchy.some((currentEntity: Type<unknown>): boolean => currentEntity === targetEntity || currentEntity.name === targetEntity.name) || entityNames.includes(targetEntity.name);
	});

	const relationList: Array<TTypeOrmRelationMetadataArguments> = getMetadataArgsStorage().relations.filter(({ target }: TTypeOrmRelationMetadataArguments): boolean => {
		if (typeof target === "string") {
			return entityNames.includes(target);
		}

		if (typeof target !== "function") {
			return false;
		}

		const targetEntity: new (...arguments_: Array<unknown>) => unknown = target as unknown as new (...arguments_: Array<unknown>) => unknown;

		return entityHierarchy.some((currentEntity: Type<unknown>): boolean => currentEntity === targetEntity || currentEntity.name === targetEntity.name) || entityNames.includes(targetEntity.name);
	});

	const entityColumns: Array<IApiEntityColumn<E>> = [
		...columnList.map(({ options, propertyName }: TTypeOrmColumnMetadataArguments) => {
			const metadata: Record<string, unknown> | undefined = storage.getMetadata(metadataTarget, propertyName);

			return {
				isPrimary: Boolean(options.primary),
				metadata,
				name: propertyName as keyof E,
				// eslint-disable-next-line @elsikora/typescript/no-non-null-assertion
				type: options.type!,
			};
		}),
		...relationList.map(({ propertyName, relationType, type }: TTypeOrmRelationMetadataArguments) => {
			const metadata: Record<string, unknown> | undefined = storage.getMetadata(metadataTarget, propertyName);

			let relationTarget: IApiBaseEntity | undefined;
			let resolvedRelationTarget: unknown = type;

			if (typeof type === "function") {
				try {
					resolvedRelationTarget = (type as () => unknown)();
				} catch {
					resolvedRelationTarget = type;
				}
			}

			if (typeof resolvedRelationTarget === "string") {
				relationTarget = { name: resolvedRelationTarget };
			} else if (typeof resolvedRelationTarget === "function" && resolvedRelationTarget.name) {
				relationTarget = resolvedRelationTarget;
			} else if (typeof resolvedRelationTarget === "object" && resolvedRelationTarget !== null && "name" in resolvedRelationTarget && typeof (resolvedRelationTarget as { name?: unknown }).name === "string") {
				relationTarget = resolvedRelationTarget;
			}

			return {
				isPrimary: false,
				metadata,
				name: propertyName as keyof E,
				relation: relationTarget
					? {
							target: relationTarget,
						}
					: undefined,
				type: relationType,
			};
		}),
	];

	const primaryKey: IApiEntityColumn<E> | undefined = entityColumns.find((column: IApiEntityColumn<E>): boolean => column.isPrimary);

	return {
		columns: entityColumns,
		name: entity.name,
		primaryKey,
		tableName,
	};
}
