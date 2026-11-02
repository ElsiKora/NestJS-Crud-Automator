const classCacheIdentifiers: WeakMap<object, number> = new WeakMap<object, number>();

let nextClassCacheIdentifier: number = 0;

/**
 * Returns the cache identifier of a class: its name plus a number unique to the class.
 * @param {{ name: string } & object} target - Entity, guard, or validator class.
 * @returns {string} Cache identifier of the class.
 */
export function DtoGenerateCacheClassIdentifier(target: { name: string } & object): string {
	let identifier: number | undefined = classCacheIdentifiers.get(target);

	if (identifier === undefined) {
		identifier = nextClassCacheIdentifier;
		nextClassCacheIdentifier += 1;
		classCacheIdentifiers.set(target, identifier);
	}

	return `${target.name}#${String(identifier)}`;
}
