import { instanceToPlain } from "class-transformer";

/**
 * Carries free-form object values through class-transformer's `instanceToPlain`, which drops the keys `constructor` and `__proto__` at any depth and builds a nested value through its own `constructor` key.
 * Inside `ClassTransformerFreeFormValue.instanceToPlain` a free-form value leaves the walk as a symbol and is put back as it was afterwards.
 * Outside it, as in a host `ClassSerializerInterceptor`, the walk gets a copy it can take without failing: the same value without those two keys, which the walk would drop anyway.
 */
export class ClassTransformerFreeFormValue {
	// The values held back by the conversion now running, or undefined outside one.
	private static heldValues: Map<symbol, unknown> | undefined;

	/**
	 * Converts a value with `instanceToPlain` and keeps every free-form object value in it exactly as it was.
	 * @param {unknown} value - Value to convert, such as a response DTO instance or a list of them.
	 * @returns {unknown} The plain value.
	 */
	public static instanceToPlain(value: unknown): unknown {
		const outerValues: Map<symbol, unknown> | undefined = ClassTransformerFreeFormValue.heldValues;
		const heldValues: Map<symbol, unknown> = new Map<symbol, unknown>();
		ClassTransformerFreeFormValue.heldValues = heldValues;

		try {
			const plain: unknown = instanceToPlain(value);

			return heldValues.size === 0 ? plain : ClassTransformerFreeFormValue.restore(plain, heldValues);
		} finally {
			ClassTransformerFreeFormValue.heldValues = outerValues;
		}
	}

	/**
	 * Gives the value class-transformer walks in place of a free-form value on the way to plain.
	 * @param {unknown} value - The free-form value.
	 * @returns {unknown} A symbol inside `instanceToPlain` of this class, otherwise a copy the walk can take.
	 */
	public static toPlain(value: unknown): unknown {
		if (ClassTransformerFreeFormValue.heldValues === undefined) {
			return ClassTransformerFreeFormValue.copyWalkable(value);
		}

		const key: symbol = Symbol("freeFormValue");
		ClassTransformerFreeFormValue.heldValues.set(key, value);

		return key;
	}

	/**
	 * Copies the plain objects and arrays of a value, leaving out the keys class-transformer cannot take. Each copied object has no prototype, so the walk finds no `constructor` to build it with.
	 * @param {unknown} value - The free-form value.
	 * @returns {unknown} The copy.
	 */
	private static copyWalkable(value: unknown): unknown {
		if (!ClassTransformerFreeFormValue.isPlainContainer(value)) {
			return value;
		}

		const copies: Map<object, Array<unknown> | Record<string, unknown>> = new Map<object, Array<unknown> | Record<string, unknown>>();
		const pending: Array<object> = [value];

		while (pending.length > 0) {
			// eslint-disable-next-line @elsikora/typescript/no-non-null-assertion -- The loop runs while the list holds items.
			const source: object = pending.pop()!;

			if (!copies.has(source)) {
				copies.set(source, Array.isArray(source) ? [] : (Object.create(null) as Record<string, unknown>));

				for (const child of Object.values(source)) {
					if (ClassTransformerFreeFormValue.isPlainContainer(child)) {
						pending.push(child);
					}
				}
			}
		}

		for (const [source, copy] of copies) {
			for (const [key, child] of Object.entries(source)) {
				if (key !== "constructor" && key !== "__proto__") {
					ClassTransformerFreeFormValue.setOwnValue(copy, key, ClassTransformerFreeFormValue.isPlainContainer(child) ? copies.get(child) : child);
				}
			}
		}

		return copies.get(value);
	}

	/**
	 * Checks whether a value is an array or an object with no class of its own, which is what a free-form value holds.
	 * @param {unknown} value - Value to check.
	 * @returns {boolean} True for an array, a plain object or a null-prototype object.
	 */
	private static isPlainContainer(value: unknown): value is object {
		if (typeof value !== "object" || value === null) {
			return false;
		}

		const prototype: null | object = Reflect.getPrototypeOf(value);

		return Array.isArray(value) || prototype === null || prototype === Object.prototype;
	}

	/**
	 * Puts the held values back where `instanceToPlain` left their symbols. It walks only the plain value class-transformer built, never into a value it puts back.
	 * @param {unknown} plain - The plain value.
	 * @param {Map<symbol, unknown>} heldValues - The values held back, by symbol.
	 * @returns {unknown} The plain value with every free-form value in place.
	 */
	private static restore(plain: unknown, heldValues: Map<symbol, unknown>): unknown {
		if (typeof plain === "symbol") {
			return heldValues.has(plain) ? heldValues.get(plain) : plain;
		}

		const pending: Array<unknown> = [plain];

		while (pending.length > 0) {
			const container: unknown = pending.pop();

			if (typeof container === "object" && container !== null) {
				for (const [key, child] of Object.entries(container)) {
					if (typeof child === "symbol" && heldValues.has(child)) {
						ClassTransformerFreeFormValue.setOwnValue(container, key, heldValues.get(child));
					} else {
						pending.push(child);
					}
				}
			}
		}

		return plain;
	}

	/**
	 * Sets an own enumerable value, so a key such as `__proto__` is data and never a prototype.
	 * @param {object} target - Object to set the value on.
	 * @param {string} key - The key.
	 * @param {unknown} value - The value.
	 * @returns {void}
	 */
	private static setOwnValue(target: object, key: string, value: unknown): void {
		Object.defineProperty(target, key, {
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			configurable: true,
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			enumerable: true,
			value,
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			writable: true,
		});
	}
}
