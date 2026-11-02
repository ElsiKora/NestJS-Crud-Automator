import type { Type } from "@nestjs/common";

import { SWAGGER_METADATA_CONSTANT } from "@constant/swagger";
import { plainToInstance } from "class-transformer";
import { getMetadataStorage } from "class-validator";

const PUBLISHED_PROPERTY_NAMES_BY_DTO: WeakMap<Type<unknown>, ReadonlySet<string>> = new WeakMap<Type<unknown>, ReadonlySet<string>>();

/**
 * Resolves and caches the query keys a QUERY DTO publishes: properties with validation or Swagger metadata, including inherited ones, own properties of a new instance, and names exposed with `@Expose`.
 * A member of the prototype chain, such as the `object` method that anchors the generated filter-pairing validator, is not a query key.
 * @param {Type<unknown>} dto - QUERY DTO of the route.
 * @returns {ReadonlySet<string>} Published property names.
 */
export function ApiControllerGetListQueryGetPublishedNames(dto: Type<unknown>): ReadonlySet<string> {
	const cachedPropertyNames: ReadonlySet<string> | undefined = PUBLISHED_PROPERTY_NAMES_BY_DTO.get(dto);

	if (cachedPropertyNames) {
		return cachedPropertyNames;
	}

	const instance: object = new dto() as object;
	const swaggerPropertyNames: Array<string> = ((Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES_ARRAY, dto.prototype as object) as Array<string> | undefined) ?? []).map((propertyName: string): string => propertyName.replace(/^:/u, ""));

	const candidateNames: Array<string> = [
		...getMetadataStorage()
			.getTargetValidationMetadatas(dto, "", true, false)
			.map(({ propertyName }: { propertyName: string }): string => propertyName),
		...swaggerPropertyNames,
		...getExposedQueryNames(dto),
	];
	const publishedPropertyNames: ReadonlySet<string> = new Set<string>([...candidateNames.filter((propertyName: string): boolean => !(propertyName in (dto.prototype as object))), ...Object.keys(instance)]);

	PUBLISHED_PROPERTY_NAMES_BY_DTO.set(dto, publishedPropertyNames);

	return publishedPropertyNames;
}

/**
 * Reads the query keys a QUERY DTO exposes, such as `sort` for `@Expose({ name: "sort" }) orderBy`. class-transformer offers its expose metadata only through the keys it looks up while converting, so this converts an empty query and records them.
 * @param {Type<unknown>} dto - QUERY DTO of the route.
 * @returns {Array<string>} Exposed query keys.
 */
function getExposedQueryNames(dto: Type<unknown>): Array<string> {
	const exposedQueryNames: Array<string> = [];

	plainToInstance(
		dto,
		new Proxy<object>(
			{},
			{
				get: (target: object, key: string | symbol): unknown => {
					if (typeof key === "string") {
						exposedQueryNames.push(key);
					}

					return Reflect.get(target, key);
				},
			},
		),
	);

	return exposedQueryNames;
}
