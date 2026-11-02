import { ClassTransformerGetStorage } from "@utility/class-transformer/get-storage.utility";
import { ErrorException } from "@utility/error/exception.utility";

/**
 * Refuses a property that an exclude covers on plain-to-class while an `@Expose`, own or inherited, gives it a name.
 * class-transformer filters excluded keys by the property name but adds the exposed name afterwards, so the exposed name still reads into the excluded property.
 * An exclude limited to `toPlainOnly` does not apply on plain-to-class, so it stays legal.
 * @param {object} target - Decorated DTO prototype.
 * @param {string | symbol} propertyKey - Decorated property key.
 */
export function ClassTransformerAssertExcludeUnnamed(target: object, propertyKey: string | symbol): void {
	const storage: ReturnType<typeof ClassTransformerGetStorage> = ClassTransformerGetStorage(target, propertyKey);
	const exclude: ReturnType<typeof storage.findExcludeMetadata> = storage.findExcludeMetadata(target.constructor, propertyKey);
	const isExcludedOnPlainToClass: boolean = exclude !== undefined && (exclude.options?.toPlainOnly !== true || exclude.options.toClassOnly === true);

	if (isExcludedOnPlainToClass && storage.findExposeMetadata(target.constructor, propertyKey)?.options?.name !== undefined) {
		throw ErrorException(`Cannot combine a named @Expose with @Exclude or isExpose: false on '${target.constructor.name}.${String(propertyKey)}': class-transformer still reads the exposed name from a plain object into the excluded property. Remove one of them, or limit the exclude with @Exclude({ toPlainOnly: true })`);
	}
}
