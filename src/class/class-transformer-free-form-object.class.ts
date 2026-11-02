/**
 * Stands in for a stored free-form object that holds the key `constructor` or `__proto__`, which class-transformer cannot walk.
 * JSON shows the object exactly as stored. class-transformer walks the own keys of the stand-in, which are the other keys of the object, as it would answer them.
 */
export class ClassTransformerFreeFormObject {
	// The stored objects, kept off the instances so no walk reads them as keys.
	private static readonly STORED_VALUES: WeakMap<ClassTransformerFreeFormObject, object> = new WeakMap<ClassTransformerFreeFormObject, object>();

	/**
	 * @param {object} stored - The object as stored.
	 */
	constructor(stored: object) {
		ClassTransformerFreeFormObject.STORED_VALUES.set(this, stored);
	}

	/**
	 * Shows the object as stored when the instance is serialized.
	 * @returns {object | undefined} The object as stored.
	 */
	public toJSON(): object | undefined {
		return ClassTransformerFreeFormObject.STORED_VALUES.get(this);
	}
}
