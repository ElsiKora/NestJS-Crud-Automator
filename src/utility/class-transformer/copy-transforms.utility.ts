import type { TClassTransformerTransformMetadata } from "class-transformer/cjs/storage.js";

import { AUTOMATOR_TRANSFORM_DTO_CONSTANT } from "@constant/dto/automator-transform.constant";
import { ClassTransformerGetStorage } from "@utility/class-transformer/get-storage.utility";

type TStorage = ReturnType<typeof ClassTransformerGetStorage>;
type TTransformMetadata = TClassTransformerTransformMetadata;

/**
 * Copies every `@Transform` of a class and its parents onto a generated copy of it, and the `@Type` of each property the copy does not replay.
 * Call it after the replay of the Automator property decorators: their own transforms come from the replay, and the copy runs every transform of a property in the order the source runs them.
 * @param {new () => unknown} source - Class to read from.
 * @param {new () => unknown} target - Generated copy without a parent class.
 * @param {ReadonlySet<string | symbol>} replayedPropertyNames - Properties whose Automator decorators were replayed on the copy.
 */
export function ClassTransformerCopyTransforms(source: new () => unknown, target: new () => unknown, replayedPropertyNames: ReadonlySet<string | symbol>): void {
	const storage: TStorage = ClassTransformerGetStorage(source.prototype as object, "*");
	const classes: Array<object> = [source, ...storage.getAncestors(source)];
	const propertyNames: Set<string> = new Set<string>();

	for (const sourceClass of classes) {
		for (const propertyName of [...(storage._transformMetadatas.get(sourceClass)?.keys() ?? []), ...(storage._typeMetadatas.get(sourceClass)?.keys() ?? [])]) {
			propertyNames.add(propertyName);
		}
	}

	for (const propertyName of propertyNames) {
		copyPropertyTransforms(storage, source, target, propertyName);

		const typeMetadata: ReturnType<TStorage["findTypeMetadata"]> = storage.findTypeMetadata(source, propertyName);

		if (typeMetadata && !replayedPropertyNames.has(propertyName) && !storage.findTypeMetadata(target, propertyName)) {
			storage.addTypeMetadata({ ...typeMetadata, target });
		}
	}
}

/**
 * Rebuilds the transforms of one property of the copy so they run as on the source: a transform of the user is copied, and an Automator transform is taken from the replay at its place.
 * @param {TStorage} storage - class-transformer metadata storage.
 * @param {object} source - Class to read from.
 * @param {object} target - Generated copy without a parent class.
 * @param {string} propertyName - Property key.
 * @private
 */
function copyPropertyTransforms(storage: TStorage, source: object, target: object, propertyName: string): void {
	const sourceTransforms: Array<TTransformMetadata> = getTransformsInRunOrder(storage, source, propertyName);

	if (sourceTransforms.every((metadata: TTransformMetadata): boolean => isAutomatorTransform(metadata))) {
		return;
	}

	const replayedTransforms: Array<TTransformMetadata> = getTransformsInRunOrder(storage, target, propertyName);
	const transforms: Array<TTransformMetadata> = [];

	for (const metadata of sourceTransforms) {
		if (!isAutomatorTransform(metadata)) {
			transforms.push({ ...metadata, target });

			continue;
		}

		const replayed: TTransformMetadata | undefined = replayedTransforms.shift();

		if (replayed) {
			transforms.push(replayed);
		}
	}

	transforms.push(...replayedTransforms);

	let targetTransforms: Map<string, Array<TTransformMetadata>> | undefined = storage._transformMetadatas.get(target);

	if (!targetTransforms) {
		targetTransforms = new Map<string, Array<TTransformMetadata>>();
		storage._transformMetadatas.set(target, targetTransforms);
	}

	// class-transformer runs the transforms of a class in the reverse order of their registration.
	targetTransforms.set(propertyName, transforms.toReversed());
}

/**
 * Lists the transforms of a property in the order class-transformer runs them: those of the parents first, each class in the reverse order of registration.
 * @param {TStorage} storage - class-transformer metadata storage.
 * @param {object} target - Class to read from.
 * @param {string} propertyName - Property key.
 * @returns {Array<TTransformMetadata>} The transforms, in run order, whatever their direction.
 * @private
 */
function getTransformsInRunOrder(storage: TStorage, target: object, propertyName: string): Array<TTransformMetadata> {
	const ancestorTransforms: Array<TTransformMetadata> = storage.getAncestors(target).flatMap((ancestor: object): Array<TTransformMetadata> => storage._transformMetadatas.get(ancestor)?.get(propertyName) ?? []);

	return [...ancestorTransforms.toReversed(), ...(storage._transformMetadatas.get(target)?.get(propertyName) ?? []).toReversed()];
}

/**
 * Returns whether a transform belongs to an Automator property decorator.
 * @param {TTransformMetadata} metadata - Transform metadata.
 * @returns {boolean} Whether the replay of the decorator brings it back.
 * @private
 */
function isAutomatorTransform(metadata: TTransformMetadata): boolean {
	return Reflect.getMetadata(AUTOMATOR_TRANSFORM_DTO_CONSTANT.METADATA_KEY, metadata.transformFn) === true;
}
