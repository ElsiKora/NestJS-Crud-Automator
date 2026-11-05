import type { IApiControllerPropertiesRouteGetListQueryFilterLink } from "@interface/decorator/api";
import type { Type } from "@nestjs/common";
import type { TApiControllerGetListQueryFilterLinkFields, TApiControllerGetListQueryRelationTarget, TApiControllerGetListQueryRelationToOneKey } from "@type/decorator/api/controller";

/**
 * Declares a link entity for the `links` of a typed GET_LIST filter: a to-many edge whose route entity holds no relation property for it.
 * The relations and the field paths are checked against the link class when this compiles, and against the entity metadata at startup.
 * @param {Type<L>} entity - Link entity class.
 * @param {object} link - The relations it crosses and its fields.
 * @param {TApiControllerGetListQueryFilterLinkFields<TApiControllerGetListQueryRelationTarget<L[TTarget]>>} link.fields - The fields by their path on the target entity.
 * @param {TApiControllerGetListQueryRelationToOneKey<L>} link.source - Owning to-one relation that points back at the route entity.
 * @param {TTarget} link.target - Owning to-one relation that leads on.
 * @returns {IApiControllerPropertiesRouteGetListQueryFilterLink} The link.
 * @template L - Link entity type.
 * @template TTarget - Name of the target relation.
 */
export function ApiControllerGetListQueryLink<L, TTarget extends TApiControllerGetListQueryRelationToOneKey<L>>(
	entity: Type<L>,
	link: {
		fields: TApiControllerGetListQueryFilterLinkFields<TApiControllerGetListQueryRelationTarget<L[TTarget]>>;
		source: TApiControllerGetListQueryRelationToOneKey<L>;
		target: TTarget;
	},
): IApiControllerPropertiesRouteGetListQueryFilterLink {
	return { entity, fields: link.fields, source: link.source, target: link.target };
}
