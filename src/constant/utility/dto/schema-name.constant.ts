export const DTO_SCHEMA_NAME_CONSTANT: { readonly CONTROLLER_METADATA_KEY: string; readonly CUSTOM_ROUTE_METADATA_KEY: string; readonly ORIGIN_METADATA_KEY: string } = {
	// Set on the class decorated with `@ApiController`; a subclass or mixin inherits it, so it names the class whose schema prefix the routes use.
	CONTROLLER_METADATA_KEY: "DTO_SCHEMA_NAME_CONTROLLER_METADATA_KEY",
	// Set on a `@ApiRouteCustom` handler; it keeps the route configuration and the Swagger metadata its request DTOs added, so a decorated controller that inherits the handler can name them after itself.
	CUSTOM_ROUTE_METADATA_KEY: "DTO_SCHEMA_NAME_CUSTOM_ROUTE_METADATA_KEY",
	// Set on a generated DTO class; it names the route or parent DTO the class was generated from.
	ORIGIN_METADATA_KEY: "DTO_SCHEMA_NAME_ORIGIN_METADATA_KEY",
} as const;
