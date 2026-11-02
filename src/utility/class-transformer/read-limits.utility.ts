import { ClassTransformerGetStorage } from "@utility/class-transformer/get-storage.utility";
import { TransformationType } from "class-transformer";

/**
 * Tells whether the `@Expose` of a property, or any `@Transform` that runs on the way from the request, depends on class-transformer groups or versions.
 * @param {{ prototype: object }} dto - DTO class.
 * @param {object} dto.prototype - Prototype of the DTO class.
 * @param {string} property - Property name.
 * @returns {{ isExposeLimited: boolean; isTransformLimited: boolean }} Whether a version limits the `@Expose`, and whether a group or a version limits a `@Transform`.
 */
export function ClassTransformerReadLimits(dto: { prototype: object }, property: string): { isExposeLimited: boolean; isTransformLimited: boolean } {
	const storage: ReturnType<typeof ClassTransformerGetStorage> = ClassTransformerGetStorage(dto.prototype, property);
	const exposeOptions: { since?: number; until?: number } | undefined = storage.findExposeMetadata(dto, property)?.options;

	return {
		isExposeLimited: exposeOptions?.since !== undefined || exposeOptions?.until !== undefined,
		isTransformLimited: storage.findTransformMetadatas(dto, property, TransformationType.PLAIN_TO_CLASS).some(({ options }: { options?: { groups?: Array<string>; since?: number; until?: number } }): boolean => (options?.groups?.length ?? 0) > 0 || options?.since !== undefined || options?.until !== undefined),
	};
}
