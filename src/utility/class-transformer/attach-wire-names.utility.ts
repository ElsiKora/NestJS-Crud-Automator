import { ClassTransformerGetStorage } from "@utility/class-transformer/get-storage.utility";

/**
 * Gives every DTO instance in a value a `toJSON` that writes its properties under their `@Expose` names and leaves out a property excluded on the way to plain.
 * No transform runs: the values are the ones plain-to-class built, and a nested DTO, a `Date` or a free-form value serializes as JSON would serialize it anyway.
 * `toJSON` is not enumerable, so class-to-plain (`ClassSerializerInterceptor`, the cursor response step) neither sees nor copies it.
 * @param {unknown} value - DTO instance built by plain-to-class, or an array of them.
 * @returns {void}
 */
export function ClassTransformerAttachWireNames(value: unknown): void {
	attachWireNames(value, new WeakSet<object>());
}

/**
 * Walks a value and attaches the wire `toJSON` to each DTO instance once.
 * @param {unknown} value - Value to walk.
 * @param {WeakSet<object>} visited - Objects already walked.
 * @returns {void}
 * @private
 */
function attachWireNames(value: unknown, visited: WeakSet<object>): void {
	if (typeof value !== "object" || value === null || visited.has(value)) {
		return;
	}

	visited.add(value);

	if (Array.isArray(value)) {
		for (const item of value as Array<unknown>) {
			attachWireNames(item, visited);
		}

		return;
	}

	const prototype: unknown = Object.getPrototypeOf(value);

	if (prototype === Object.prototype || prototype === null || typeof Reflect.get(value, "toJSON") === "function") {
		return;
	}

	for (const key of Object.keys(value)) {
		attachWireNames(Reflect.get(value, key), visited);
	}

	const constructor: object = value.constructor;
	const storage: ReturnType<typeof ClassTransformerGetStorage> = ClassTransformerGetStorage(prototype as object, "*");
	const wireNames: Map<string, string> = new Map<string, string>();
	const excludedNames: Set<string> = new Set<string>();

	for (const { options, propertyName } of storage.getExposedMetadatas(constructor)) {
		if (options?.name !== undefined && options.toClassOnly !== true) {
			wireNames.set(propertyName, options.name);
		}
	}

	for (const { options, propertyName } of storage.getExcludedMetadatas(constructor)) {
		if (typeof propertyName === "string" && options?.toClassOnly !== true) {
			excludedNames.add(propertyName);
		}
	}

	if (wireNames.size === 0 && excludedNames.size === 0) {
		return;
	}

	Object.defineProperty(value, "toJSON", {
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		configurable: true,
		value(this: object): Record<string, unknown> {
			const wire: Record<string, unknown> = {};

			for (const key of Object.keys(this)) {
				if (!excludedNames.has(key)) {
					wire[wireNames.get(key) ?? key] = Reflect.get(this, key);
				}
			}

			return wire;
		},
	});
}
