import type { ClassConstructor } from "class-transformer";

import { ClassTransformerGetStorage } from "@utility/class-transformer/get-storage.utility";

/**
 * Prepares a handler result for plain-to-class, which reads a renamed property from its exposed name: the value of each property key is made readable under that name.
 * The handler's property key stays the only source, so a key of the result that merely equals an exposed name is not read. Nested DTOs follow their `@Type`.
 * @param {ClassConstructor<unknown>} dto - DTO class describing the value.
 * @param {unknown} value - Handler result, or an array of them.
 * @returns {unknown} The value itself when nothing is renamed, otherwise an object that inherits from it and adds the exposed names.
 */
export function ClassTransformerSourceToExposed(dto: ClassConstructor<unknown>, value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map((item: unknown): unknown => ClassTransformerSourceToExposed(dto, item));
	}

	if (typeof value !== "object" || value === null) {
		return value;
	}

	const storage: ReturnType<typeof ClassTransformerGetStorage> = ClassTransformerGetStorage(dto.prototype as object, "*");
	const exposedProperties: PropertyDescriptorMap = {};

	for (const { options, propertyName } of storage.getExposedMetadatas(dto)) {
		const source: unknown = Reflect.get(value, propertyName);
		const exposed: unknown = exposeNestedValue(storage, dto, propertyName, value, source);
		const exposedName: string = options?.name ?? propertyName;

		// A source key that merely equals the exposed name is masked; with neither key there is nothing to read.
		if ((exposedName !== propertyName || exposed !== source) && (exposed !== undefined || exposedName in value)) {
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			exposedProperties[exposedName] = { enumerable: true, value: exposed };
		}
	}

	return Object.keys(exposedProperties).length > 0 ? (Object.create(value, exposedProperties) as unknown) : value;
}

/**
 * Applies the rename to a nested value, or to each item of a nested array, through the DTO class its `@Type` declares.
 * @param {ReturnType<typeof ClassTransformerGetStorage>} storage - class-transformer metadata storage.
 * @param {ClassConstructor<unknown>} dto - DTO class holding the property.
 * @param {string} propertyName - Property key.
 * @param {object} value - Object holding the nested value.
 * @param {unknown} nested - Nested value.
 * @returns {unknown} The nested value itself when nothing below it is renamed.
 * @private
 */
function exposeNestedValue(storage: ReturnType<typeof ClassTransformerGetStorage>, dto: ClassConstructor<unknown>, propertyName: string, value: object, nested: unknown): unknown {
	const metadata: ReturnType<typeof storage.findTypeMetadata> = storage.findTypeMetadata(dto, propertyName);

	if (!metadata) {
		return nested;
	}

	const exposeItem = (item: unknown): unknown => {
		const itemDto: ClassConstructor<unknown> | undefined = resolveItemDto(metadata, propertyName, value, item);

		return itemDto ? ClassTransformerSourceToExposed(itemDto, item) : item;
	};

	if (!Array.isArray(nested)) {
		return exposeItem(nested);
	}

	const items: Array<unknown> = nested.map((item: unknown): unknown => exposeItem(item));

	return items.every((item: unknown, index: number): boolean => item === nested[index]) ? nested : items;
}

/**
 * Resolves the DTO class of one nested value from its `@Type`, picking the discriminator subtype of a polymorphic property.
 * @param {NonNullable<ReturnType<ReturnType<typeof ClassTransformerGetStorage>["findTypeMetadata"]>>} metadata - The `@Type` metadata of the property.
 * @param {string} propertyName - Property key.
 * @param {object} value - Object holding the nested value.
 * @param {unknown} item - Nested value.
 * @returns {ClassConstructor<unknown> | undefined} The DTO class of the value, if the property declares one.
 * @private
 */
function resolveItemDto(metadata: NonNullable<ReturnType<ReturnType<typeof ClassTransformerGetStorage>["findTypeMetadata"]>>, propertyName: string, value: object, item: unknown): ClassConstructor<unknown> | undefined {
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
