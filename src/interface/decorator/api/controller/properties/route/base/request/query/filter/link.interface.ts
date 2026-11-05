import type { TMetadataStorageTarget } from "@type/class";

/**
 * A link entity a typed filter crosses, which `ApiControllerGetListQueryLink` builds: a to-many edge with no relation property on the route entity.
 */
export interface IApiControllerPropertiesRouteGetListQueryFilterLink {
	/** Link entity class. */
	entity: TMetadataStorageTarget;
	/** The fields of the link by their path on the target entity. Their query name is the link name, a dot and this path. */
	fields: Readonly<Record<string, unknown>>;
	/** Owning to-one relation of the link entity that points back at the route entity. */
	source: string;
	/** Owning to-one relation of the link entity that leads on. */
	target: string;
}
