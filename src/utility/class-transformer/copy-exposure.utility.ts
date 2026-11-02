import { ClassTransformerGetStorage } from "@utility/class-transformer/get-storage.utility";
import { Exclude, Expose } from "class-transformer";

/**
 * Copies every `@Expose` and `@Exclude` of a class and its parents onto another class, so a copy of a DTO keeps what reaches the wire and under which name.
 * @param {new () => unknown} source - Class to read from.
 * @param {new () => unknown} target - Class to write to.
 */
export function ClassTransformerCopyExposure(source: new () => unknown, target: new () => unknown): void {
	const storage: ReturnType<typeof ClassTransformerGetStorage> = ClassTransformerGetStorage(source.prototype as object, "*");

	for (const { options, propertyName } of storage.getExposedMetadatas(source)) {
		Expose(options)(target.prototype as object, propertyName);
	}

	for (const { options, propertyName } of storage.getExcludedMetadatas(source)) {
		Exclude(options)(target.prototype as object, propertyName);
	}

	const strategy: string = storage.getStrategy(source);

	if (strategy === "excludeAll") {
		Exclude()(target);
	}

	if (strategy === "exposeAll") {
		Expose()(target);
	}
}
