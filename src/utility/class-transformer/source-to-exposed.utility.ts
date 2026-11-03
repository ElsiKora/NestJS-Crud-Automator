import type { ClassConstructor } from "class-transformer";

import { EXPOSED_SOURCE_DTO_CONSTANT } from "@constant/dto/exposed-source.constant";
import { ClassTransformerGetStorage } from "@utility/class-transformer/get-storage.utility";
import { ClassTransformerResolveItemDto } from "@utility/class-transformer/resolve-item-dto.utility";

/**
 * Prepares a handler result for plain-to-class, which reads a renamed property from its exposed name: the value of each property key is made readable under that name.
 * The handler's property key stays the only source, so a key of the result that merely equals an exposed name is not read. Nested DTOs follow their `@Type`.
 * The object handed over owns a copy of each own enumerable key of the result, so a transform enumerates the full row in `obj`, and it inherits from the result, so a getter still reads.
 * It carries `EXPOSED_SOURCE_DTO_CONSTANT.MARKER`, so it is never refused as a request that sends a property key.
 * @param {ClassConstructor<unknown>} dto - DTO class describing the value.
 * @param {unknown} value - Handler result, or an array of them.
 * @returns {unknown} The value itself when the DTO renames nothing and no nested value changes, otherwise an object that inherits from it with the exposed names added.
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
	let isChanged: boolean = false;

	for (const { options, propertyName } of storage.getExposedMetadatas(dto)) {
		const source: unknown = Reflect.get(value, propertyName);
		const exposed: unknown = exposeNestedValue(storage, dto, propertyName, value, source);
		const exposedName: string = options?.name ?? propertyName;

		if (exposedName === propertyName && exposed === source) {
			continue;
		}

		isChanged = true;

		// A source key that merely equals the exposed name is masked; with neither key there is nothing to read.
		if (exposed !== undefined || exposedName in value) {
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			exposedProperties[exposedName] = { enumerable: true, value: exposed };
		}
	}

	if (!isChanged) {
		return value;
	}

	const rowProperties: PropertyDescriptorMap = {};

	for (const key of Object.keys(value)) {
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		rowProperties[key] = { enumerable: true, value: Reflect.get(value, key) as unknown };
	}

	// eslint-disable-next-line @elsikora/typescript/naming-convention
	return Object.create(value, { ...rowProperties, ...exposedProperties, [EXPOSED_SOURCE_DTO_CONSTANT.MARKER]: { value: true } }) as unknown;
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
		const itemDto: ClassConstructor<unknown> | undefined = ClassTransformerResolveItemDto(metadata, propertyName, value, item);

		return itemDto ? ClassTransformerSourceToExposed(itemDto, item) : item;
	};

	if (!Array.isArray(nested)) {
		return exposeItem(nested);
	}

	const items: Array<unknown> = nested.map((item: unknown): unknown => exposeItem(item));

	return items.every((item: unknown, index: number): boolean => item === nested[index]) ? nested : items;
}
