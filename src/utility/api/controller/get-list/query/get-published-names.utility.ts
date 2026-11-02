import type { Type } from "@nestjs/common";

import { SWAGGER_METADATA_CONSTANT } from "@constant/swagger";
import { ClassTransformerGetStorage } from "@utility/class-transformer/get-storage.utility";
import { TransformationType } from "class-transformer";
import { getMetadataStorage } from "class-validator";

const PUBLISHED_PROPERTY_NAMES_BY_DTO: WeakMap<Type<unknown>, ReadonlySet<string>> = new WeakMap<Type<unknown>, ReadonlySet<string>>();

/**
 * Resolves and caches the query keys a QUERY DTO publishes: properties with validation, Swagger or `@Expose` metadata, including inherited ones, and own properties of a new instance.
 * A property exposed under another name publishes that name instead of its own, because the name is what class-transformer reads, so the DTO's validators never see a value sent under the property name.
 * A read-only member of the prototype chain, such as the `object` method that anchors the generated filter-pairing validator, is not a query key.
 * @param {Type<unknown>} dto - QUERY DTO of the route.
 * @returns {ReadonlySet<string>} Published property names.
 */
export function ApiControllerGetListQueryGetPublishedNames(dto: Type<unknown>): ReadonlySet<string> {
	const cachedPropertyNames: ReadonlySet<string> | undefined = PUBLISHED_PROPERTY_NAMES_BY_DTO.get(dto);

	if (cachedPropertyNames) {
		return cachedPropertyNames;
	}

	const prototype: object = dto.prototype as object;
	const storage: ReturnType<typeof ClassTransformerGetStorage> = ClassTransformerGetStorage(prototype, "query");
	const exposedPropertyNames: ReadonlySet<string> = new Set<string>(storage.getExposedProperties(dto, TransformationType.PLAIN_TO_CLASS));
	const swaggerPropertyNames: Array<string> = ((Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES_ARRAY, prototype) as Array<string> | undefined) ?? []).map((propertyName: string): string => propertyName.replace(/^:/u, ""));

	const candidateNames: Array<string> = [
		...getMetadataStorage()
			.getTargetValidationMetadatas(dto, "", true, false)
			.map(({ propertyName }: { propertyName: string }): string => propertyName),
		...swaggerPropertyNames,
		...exposedPropertyNames,
	];

	const publishedPropertyNames: ReadonlySet<string> = new Set<string>([...candidateNames.filter((propertyName: string): boolean => !isReadOnlyMember(prototype, propertyName)), ...Object.keys(new dto() as object)].map((propertyName: string): string => (exposedPropertyNames.has(propertyName) ? (storage.findExposeMetadata(dto, propertyName)?.options?.name ?? propertyName) : propertyName)));

	PUBLISHED_PROPERTY_NAMES_BY_DTO.set(dto, publishedPropertyNames);

	return publishedPropertyNames;
}

/**
 * Tells whether the prototype chain holds a member under this name that a query cannot set, such as a method or a getter without a setter.
 * @param {object} prototype - Prototype of the QUERY DTO.
 * @param {string} propertyName - Property name.
 * @returns {boolean} Whether the name is a read-only member.
 */
function isReadOnlyMember(prototype: object, propertyName: string): boolean {
	for (let current: null | object = prototype; current; current = Object.getPrototypeOf(current) as null | object) {
		const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(current, propertyName);

		if (descriptor) {
			return descriptor.set === undefined;
		}
	}

	return false;
}
