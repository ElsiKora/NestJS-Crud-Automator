import type { ClassConstructor } from "class-transformer";
import type { ValidationError } from "class-validator";

import { UUID_CANONICAL_FAILURE_CONSTANT } from "@constant/uuid-canonical-failure.constant";
import { ApiControllerParametersCreateFailure } from "@utility/api/controller/parameters/create-failure.utility";
import { ClassTransformerGetStorage } from "@utility/class-transformer/get-storage.utility";
import { ClassTransformerResolveItemDto } from "@utility/class-transformer/resolve-item-dto.utility";
import { getMetadataStorage, IS_UUID, isUUID } from "class-validator";

/**
 * Lists each UUID a request value sends in another letter case than lower case, where its DTO validates the property as a UUID.
 * A database compares an upper-case UUID as the lower-case one, while IAM compares text, so such a value is refused rather than lower-cased.
 * The value is read as sent, under the name `@Expose({ name })` gives a property on the wire, and nested DTOs follow their `@Type`, a discriminator subtype included.
 * A value that is not a UUID at all is left to `IsUUID`.
 * @param {ClassConstructor<unknown>} dto - DTO class the route validates the value with.
 * @param {unknown} value - Request body or query as sent, or a part of it.
 * @param {string} path - Path of the value in the request, empty for the body or query itself.
 * @returns {Array<ValidationError>} One `uuidNotCanonical` failure per refused UUID, under its path such as `parentId` or `items.0.id`, with no `value` or `target`.
 */
export function ApiRouteGetNonCanonicalUuidFailures(dto: ClassConstructor<unknown>, value: unknown, path: string): Array<ValidationError> {
	const failures: Array<ValidationError> = [];

	collectFailures(dto, value, path, failures, new WeakSet<object>());

	return failures;
}

/**
 * Collects the failures of one value, or of each item of an array, against a DTO class.
 * @param {ClassConstructor<unknown>} dto - DTO class of the value.
 * @param {unknown} value - Value as sent.
 * @param {string} path - Path of the value.
 * @param {Array<ValidationError>} failures - Failures found so far.
 * @param {WeakSet<object>} visited - Objects already walked, since a multipart parser can point a field back at the body.
 * @returns {void}
 * @private
 */
function collectFailures(dto: ClassConstructor<unknown>, value: unknown, path: string, failures: Array<ValidationError>, visited: WeakSet<object>): void {
	if (typeof value !== "object" || value === null || visited.has(value)) {
		return;
	}

	visited.add(value);

	if (Array.isArray(value)) {
		for (const [index, item] of (value as Array<unknown>).entries()) {
			collectFailures(dto, item, joinPath(path, String(index)), failures, visited);
		}

		return;
	}

	const storage: ReturnType<typeof ClassTransformerGetStorage> = ClassTransformerGetStorage(dto.prototype as object, "*");
	const uuidProperties: Set<string> = new Set<string>();
	const propertyNames: Set<string> = new Set<string>();

	for (const metadata of getMetadataStorage().getTargetValidationMetadatas(dto, "", true, false)) {
		propertyNames.add(metadata.propertyName);

		if (metadata.name === IS_UUID) {
			uuidProperties.add(metadata.propertyName);
		}
	}

	for (const propertyName of propertyNames) {
		const wireName: string = storage.findExposeMetadata(dto, propertyName)?.options?.name ?? propertyName;

		if (!Object.hasOwn(value, wireName)) {
			continue;
		}

		const sent: unknown = Reflect.get(value, wireName);
		const propertyPath: string = joinPath(path, wireName);

		if (uuidProperties.has(propertyName)) {
			collectUuidFailures(sent, propertyPath, failures);
		}

		const typeMetadata: ReturnType<typeof storage.findTypeMetadata> = storage.findTypeMetadata(dto, propertyName);

		if (!typeMetadata) {
			continue;
		}

		for (const [itemPath, item] of Array.isArray(sent) ? (sent as Array<unknown>).map((entry: unknown, index: number): [string, unknown] => [joinPath(propertyPath, String(index)), entry]) : [[propertyPath, sent] as [string, unknown]]) {
			const itemDto: ClassConstructor<unknown> | undefined = ClassTransformerResolveItemDto(typeMetadata, propertyName, value, item);

			if (itemDto) {
				collectFailures(itemDto, item, itemPath, failures, visited);
			}
		}
	}
}

/**
 * Collects the failure of a sent UUID, or of each item of a sent list, that is not in lower case.
 * @param {unknown} sent - Property value as sent.
 * @param {string} path - Path of the property.
 * @param {Array<ValidationError>} failures - Failures found so far.
 * @returns {void}
 * @private
 */
function collectUuidFailures(sent: unknown, path: string, failures: Array<ValidationError>): void {
	if (Array.isArray(sent)) {
		for (const [index, item] of (sent as Array<unknown>).entries()) {
			collectUuidFailures(typeof item === "string" ? item : undefined, joinPath(path, String(index)), failures);
		}

		return;
	}

	if (typeof sent === "string" && sent !== sent.toLowerCase() && isUUID(sent)) {
		failures.push(ApiControllerParametersCreateFailure(path, UUID_CANONICAL_FAILURE_CONSTANT.NOT_CANONICAL_CONSTRAINT, `${path} must be a lower-case UUID`));
	}
}

/**
 * Appends a segment to a dotted request path.
 * @param {string} path - Path so far, empty at the top.
 * @param {string} segment - Property name or array index.
 * @returns {string} The joined path.
 * @private
 */
function joinPath(path: string, segment: string): string {
	return path ? `${path}.${segment}` : segment;
}
