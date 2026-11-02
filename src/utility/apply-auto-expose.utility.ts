import { ClassTransformerGetStorage } from "@utility/class-transformer/get-storage.utility";
import { Expose } from "class-transformer";

/**
 * Exposes a property under its own name, unless an `@Expose` of the class or a parent already covers it.
 * class-transformer keeps one `@Expose` per property and the last one wins, so without this check the bare `Expose()` of an `@ApiProperty*` decorator
 * would erase the name, groups or versions of an explicit `@Expose` that ran before it. Which one runs first depends on the source order and on when a lazy entity resolves.
 * @param {object} target - Decorated DTO prototype.
 * @param {string | symbol} propertyKey - Decorated property key.
 */
export function ApplyAutoExpose(target: object, propertyKey: string | symbol): void {
	if (ClassTransformerGetStorage(target, propertyKey).findExposeMetadata(target.constructor, propertyKey)) {
		return;
	}

	Expose()(target, propertyKey);
}
