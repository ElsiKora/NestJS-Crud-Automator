/**
 * Describes the route DTO that a schema class belongs to, so the same route DTO always gets the same origin in the schema name registry.
 * @param {string} schemaPrefix - Schema prefix of the controller that owns the route.
 * @param {string} route - Route type, or the handler method name of a custom route.
 * @param {string} dtoType - DTO type.
 * @returns {string} The origin, for example `the get response DTO of controller prefix "AdminUser"`.
 */
export function DtoSchemaNameGetRouteOrigin(schemaPrefix: string, route: string, dtoType: string): string {
	return `the ${route} ${dtoType} DTO of controller prefix "${schemaPrefix}"`;
}
