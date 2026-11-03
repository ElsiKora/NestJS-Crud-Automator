import type { ClassTransformerGetStorage } from "@utility/class-transformer/get-storage.utility";
import type { ClassConstructor } from "class-transformer";

/**
 * Resolves the DTO class of one nested value from its `@Type`, picking the discriminator subtype of a polymorphic property.
 * @param {NonNullable<ReturnType<ReturnType<typeof ClassTransformerGetStorage>["findTypeMetadata"]>>} metadata - The `@Type` metadata of the property.
 * @param {string} propertyName - Property key.
 * @param {object} value - Object holding the nested value.
 * @param {unknown} item - Nested value.
 * @returns {ClassConstructor<unknown> | undefined} The DTO class of the value, if the property declares one.
 */
export function ClassTransformerResolveItemDto(metadata: NonNullable<ReturnType<ReturnType<typeof ClassTransformerGetStorage>["findTypeMetadata"]>>, propertyName: string, value: object, item: unknown): ClassConstructor<unknown> | undefined {
	if (typeof item !== "object" || item === null) {
		return undefined;
	}

	if (metadata.options.discriminator) {
		const subTypeName: unknown = Reflect.get(item, metadata.options.discriminator.property);

		return metadata.options.discriminator.subTypes.find(({ name }: { name: string }): boolean => name === subTypeName)?.value;
	}

	const type: unknown = metadata.typeFunction({ newObject: {}, object: value, property: propertyName });

	return typeof type === "function" && type !== Object ? (type as ClassConstructor<unknown>) : undefined;
}
