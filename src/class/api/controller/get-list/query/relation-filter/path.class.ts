import type { IApiControllerGetListQueryPlanFilterRelationHop } from "@interface/class/api/controller/get-list/query/plan/filter/relation";
import type { IApiControllerGetListQueryRelationFilterPath } from "@interface/class/api/controller/get-list/query/relation-filter";
import type { IApiControllerPropertiesRouteGetListQueryFilterLink } from "@interface/decorator/api";
import type { TMetadataStorageTarget } from "@type/class";
import type { TTypeOrmRelationMetadataArguments } from "@type/utility/typeorm";

import { GET_LIST_QUERY_DTO_FACTORY_CONSTANT } from "@constant/factory-dto-get-list-query.constant";
import { FILTER_RELATION_CONSTANT } from "@constant/filter/relation.constant";
import { ErrorException } from "@utility/error/exception.utility";
import { GetClassHierarchy } from "@utility/get/class-hierarchy.utility";
import { ResolveMetadataTarget } from "@utility/resolve/metadata-target.utility";
import { ResolveRelationTarget } from "@utility/resolve/relation-target.utility";
import { getMetadataArgsStorage } from "typeorm";

// Relations that hold several rows.
const RELATION_FILTER_TO_MANY_TYPES: ReadonlySet<string> = new Set<string>(["many-to-many", "one-to-many"]);

/**
 * Reads what a relation filter key names from the TypeORM decorators, which exist while a controller is decorated, so a
 * key that names nothing stops startup before any DataSource does. What only the entity metadata of a DataSource tells
 * is left to `ApiControllerGetListQueryRelationFilterSubquery`.
 */
export class ApiControllerGetListQueryRelationFilterPath {
	/**
	 * Tells whether a `fields` key reaches past what a typed plan offers without a declaration: deeper than one relation, or through a to-many relation.
	 * @param {object} entity - Route entity class.
	 * @param {string} path - The key.
	 * @returns {boolean} Whether the key needs the relation filter.
	 */
	public static isDeclaredReach(entity: object, path: string): boolean {
		const segments: Array<string> = path.split(".");

		if (segments.length < GET_LIST_QUERY_DTO_FACTORY_CONSTANT.NESTED_FILTER_PATH_SEGMENT_COUNT) {
			return false;
		}

		const relation: TTypeOrmRelationMetadataArguments | undefined = this.findRelation(ResolveMetadataTarget(entity), segments[0] ?? "");

		return segments.length > GET_LIST_QUERY_DTO_FACTORY_CONSTANT.NESTED_FILTER_PATH_SEGMENT_COUNT || (relation !== undefined && RELATION_FILTER_TO_MANY_TYPES.has(relation.relationType));
	}

	/**
	 * Reads a key of `fields`: relations from the route entity, then a column.
	 * @param {object} entity - Route entity class.
	 * @param {string} path - The key.
	 * @param {string} context - What an error names first.
	 * @returns {IApiControllerGetListQueryRelationFilterPath} What the key names.
	 * @throws {Error} When a segment before the last is no relation of the entity before it, or the path crosses too many relations.
	 */
	public static read(entity: object, path: string, context: string): IApiControllerGetListQueryRelationFilterPath {
		const segments: Array<string> = path.split(".");

		return this.readFrom(ResolveMetadataTarget(entity), segments, [], [], context);
	}

	/**
	 * Reads a field of a link: its two owning relations, then a path on its target.
	 * @param {object} entity - Route entity class.
	 * @param {IApiControllerPropertiesRouteGetListQueryFilterLink} link - The link.
	 * @param {string} path - The path of the field on the target.
	 * @param {string} context - What an error names first.
	 * @returns {IApiControllerGetListQueryRelationFilterPath} What the field names.
	 * @throws {Error} When a relation of the link does not exist, is not to-one, or its source does not point back at the route entity.
	 */
	public static readLink(entity: object, link: IApiControllerPropertiesRouteGetListQueryFilterLink, path: string, context: string): IApiControllerGetListQueryRelationFilterPath {
		const root: TMetadataStorageTarget = ResolveMetadataTarget(entity);
		const linkEntity: TMetadataStorageTarget = link.entity;
		const sourceTarget: TMetadataStorageTarget | undefined = this.readRelationTarget(this.readLinkRelation(linkEntity, link.source, context));
		const targetEntity: TMetadataStorageTarget | undefined = this.readRelationTarget(this.readLinkRelation(linkEntity, link.target, context));

		if (sourceTarget !== root) {
			throw ErrorException(`${context}: source relation "${link.source}" of link entity "${linkEntity.name}" does not point back at route entity "${root.name}"`);
		}

		if (!targetEntity) {
			throw ErrorException(`${context}: target relation "${link.target}" of link entity "${linkEntity.name}" leads to no entity`);
		}

		const hop: IApiControllerGetListQueryPlanFilterRelationHop = Object.freeze({ entity: linkEntity, relation: link.target, source: link.source, target: targetEntity });

		return this.readFrom(
			targetEntity,
			path.split("."),
			[hop],
			[
				{ entity: linkEntity, name: link.source },
				{ entity: targetEntity, name: link.target },
			],
			context,
		);
	}

	/**
	 * Finds a relation of an entity class or its parents.
	 * @param {TMetadataStorageTarget} entity - Entity class.
	 * @param {string} property - Property of the relation.
	 * @returns {TTypeOrmRelationMetadataArguments | undefined} The relation.
	 */
	private static findRelation(entity: TMetadataStorageTarget, property: string): TTypeOrmRelationMetadataArguments | undefined {
		return getMetadataArgsStorage()
			.filterRelations(GetClassHierarchy(entity))
			.find((relation: TTypeOrmRelationMetadataArguments): boolean => relation.propertyName === property);
	}

	/**
	 * Walks the rest of a path from an entity.
	 * @param {TMetadataStorageTarget} entity - The entity the rest starts at.
	 * @param {ReadonlyArray<string>} segments - The rest of the path.
	 * @param {ReadonlyArray<IApiControllerGetListQueryPlanFilterRelationHop>} previousHops - The hops so far.
	 * @param {ReadonlyArray<{ entity: TMetadataStorageTarget; name: string }>} previousRows - The rows so far.
	 * @param {string} context - What an error names first.
	 * @returns {IApiControllerGetListQueryRelationFilterPath} What the path names.
	 */
	private static readFrom(entity: TMetadataStorageTarget, segments: ReadonlyArray<string>, previousHops: ReadonlyArray<IApiControllerGetListQueryPlanFilterRelationHop>, previousRows: ReadonlyArray<{ entity: TMetadataStorageTarget; name: string }>, context: string): IApiControllerGetListQueryRelationFilterPath {
		const hops: Array<IApiControllerGetListQueryPlanFilterRelationHop> = [...previousHops];
		const rows: Array<{ entity: TMetadataStorageTarget; name: string }> = [...previousRows];
		let current: TMetadataStorageTarget = entity;

		for (const segment of segments.slice(0, -1)) {
			const relation: TTypeOrmRelationMetadataArguments | undefined = this.findRelation(current, segment);

			if (!relation) {
				throw ErrorException(`${context}: "${segment}" is no relation of entity "${current.name}"`);
			}

			const target: TMetadataStorageTarget | undefined = this.readRelationTarget(relation);

			if (!target) {
				throw ErrorException(`${context}: relation "${segment}" of entity "${current.name}" leads to no entity`);
			}

			hops.push(Object.freeze({ entity: current, relation: segment, target }));
			rows.push({ entity: target, name: segment });
			current = target;
		}

		if (rows.length > FILTER_RELATION_CONSTANT.MAXIMUM_HOPS) {
			throw ErrorException(`${context}: the path crosses ${String(rows.length)} relations, more than the ${String(FILTER_RELATION_CONSTANT.MAXIMUM_HOPS)} a filter may cross; a link entity counts as two`);
		}

		return { hops, leafEntity: current, leafProperty: segments.at(-1) ?? "", rows };
	}

	/**
	 * Reads a relation of a link entity.
	 * @param {TMetadataStorageTarget} linkEntity - The link entity class.
	 * @param {string} name - Property of the relation.
	 * @param {string} context - What an error names first.
	 * @returns {TTypeOrmRelationMetadataArguments} The relation.
	 * @throws {Error} When it does not exist or is not to-one.
	 */
	private static readLinkRelation(linkEntity: TMetadataStorageTarget, name: string, context: string): TTypeOrmRelationMetadataArguments {
		const relation: TTypeOrmRelationMetadataArguments | undefined = this.findRelation(linkEntity, name);

		if (!relation) {
			throw ErrorException(`${context}: "${name}" is no relation of link entity "${linkEntity.name}"`);
		}

		if (RELATION_FILTER_TO_MANY_TYPES.has(relation.relationType)) {
			throw ErrorException(`${context}: relation "${name}" of link entity "${linkEntity.name}" is not an owning to-one relation`);
		}

		return relation;
	}

	/**
	 * Reads the entity class a relation leads to, whichever way it names it.
	 * @param {TTypeOrmRelationMetadataArguments} relation - The relation.
	 * @returns {TMetadataStorageTarget | undefined} The entity class.
	 */
	private static readRelationTarget(relation: TTypeOrmRelationMetadataArguments): TMetadataStorageTarget | undefined {
		let relationType: unknown = relation.type;

		try {
			relationType = (relation.type as () => unknown)();
		} catch {
			// The relation names its target class or entity name directly.
		}

		if (typeof relationType === "string") {
			return ResolveRelationTarget({ name: relationType });
		}

		return relationType ? ResolveRelationTarget(relationType) : undefined;
	}
}
