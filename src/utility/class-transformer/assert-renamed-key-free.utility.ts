import { ClassTransformerGetStorage } from "@utility/class-transformer/get-storage.utility";
import { ErrorException } from "@utility/error/exception.utility";

/**
 * Refuses a child class that exposes another property under the property key of a renamed property of its parent.
 * The check of a request that sends the property key runs as a transform of the parent, which class-transformer runs on every class that inherits the property without naming the class it converts, so it would refuse the child's own property or let the key bind.
 * A key the declaring class or its ancestors already expose another property under is a name on the wire for the whole family, and it stays legal.
 * @param {object} target - Prototype of the class that declares the renamed property.
 * @param {string | symbol} propertyKey - Renamed property key.
 * @param {string} exposedName - Name the property is exposed under.
 * @throws {Error} If a child class known to class-transformer exposes another property under the property key.
 */
export function ClassTransformerAssertRenamedKeyFree(target: object, propertyKey: string | symbol, exposedName: string): void {
	if (typeof propertyKey !== "string") {
		return;
	}

	const storage: ReturnType<typeof ClassTransformerGetStorage> = ClassTransformerGetStorage(target, propertyKey);

	if (storage.getExposedMetadatas(target.constructor).some(({ options }: { options?: { name?: string } }): boolean => options?.name === propertyKey)) {
		return;
	}

	for (const [childClass, metadatas] of storage._exposeMetadatas) {
		const childPrototype: unknown = Reflect.get(childClass, "prototype");

		if (childClass === target.constructor || typeof childPrototype !== "object" || childPrototype === null || !Object.prototype.isPrototypeOf.call(target, childPrototype)) {
			continue;
		}

		for (const { options, propertyName } of metadatas.values()) {
			if (options?.name === propertyKey && propertyName !== propertyKey) {
				const parentName: string = `${target.constructor.name}.${propertyKey}`;

				throw ErrorException(`Cannot expose '${(childClass as { name: string }).name}.${propertyName}' under '${propertyKey}', the property key of '${parentName}', which is exposed as '${exposedName}': the check of a request reads that key on every class that inherits '${parentName}' and cannot tell which class is converted. Rename one of them`);
			}
		}
	}
}
