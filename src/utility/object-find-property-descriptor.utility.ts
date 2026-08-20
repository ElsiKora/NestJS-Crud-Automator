/**
 * Finds the nearest own descriptor for a property across an object's prototype chain.
 * @param {object} source - Object whose chain is inspected.
 * @param {PropertyKey} key - Property key to resolve.
 * @returns {PropertyDescriptor | undefined} Nearest descriptor, if present.
 */
export function ObjectFindPropertyDescriptor(source: object, key: PropertyKey): PropertyDescriptor | undefined {
	let current: null | object = source;

	while (current) {
		const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(current, key);

		if (descriptor) {
			return descriptor;
		}

		current = Object.getPrototypeOf(current) as null | object;
	}

	return undefined;
}
