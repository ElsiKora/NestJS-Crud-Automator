import type { TApiPropertyBaseProperties } from "@type/decorator/api/property/base/properties.type";
import type { TransformFnParams } from "class-transformer";

import { ApiRequestValidationException } from "@class/api/request-validation-exception.class";
import { EXPOSED_SOURCE_DTO_CONSTANT } from "@constant/dto/exposed-source.constant";
import { ApiProperty } from "@nestjs/swagger";
import { ApplyAutoExpose } from "@utility/apply-auto-expose.utility";
import { ClassTransformerAssertExcludeUnnamed } from "@utility/class-transformer/assert-exclude-unnamed.utility";
import { ClassTransformerAutomatorTransform } from "@utility/class-transformer/automator-transform.utility";
import { ClassTransformerGetStorage } from "@utility/class-transformer/get-storage.utility";
import { DeferPropertyDecoratorExecution } from "@utility/defer-property-decorator-execution.utility";
import { Exclude, TransformationType } from "class-transformer";
import { ValidationError } from "class-validator";

const AUTO_DTO_RESPONSE_EXPOSURE_METADATA_KEY: string = "crud-automator:auto-dto-response-exposure";

/**
 * Applies class-transformer exposure to neutral manual DTO properties without marking them
 * as Swagger response-only fields.
 *
 * Explicit response-only properties (`isResponse: true`) still rely on the decorator-specific
 * response branch that uses `ApiResponseProperty()`.
 *
 * Every property also gets the check of its `@Expose` and exclude, and its schema publishes the exposed name; these wait for a microtask, as the other decorators of the property may run after this one.
 * A renamed property is read only from its exposed name. class-transformer also binds a key equal to the property key, so a request that sends it is refused with a 400 naming that key.
 * @param {object} target - Decorated DTO prototype.
 * @param {string | symbol} propertyKey - Decorated property key.
 * @param {TApiPropertyBaseProperties} properties - Crud-automator property options.
 */
export function ApplyAutoDtoResponseExposure(target: object, propertyKey: string | symbol, properties: { isExpose?: boolean } & Pick<TApiPropertyBaseProperties, "isResponse">): void {
	if (!target) {
		return;
	}

	DeferPropertyDecoratorExecution(() => {
		ClassTransformerAssertExcludeUnnamed(target, propertyKey);

		const exposedName: string | undefined = ClassTransformerGetStorage(target, propertyKey).findExposeMetadata(target.constructor, propertyKey)?.options?.name;

		if (exposedName !== undefined) {
			ApiProperty({ name: exposedName })(target, propertyKey);
			ClassTransformerAutomatorTransform(
				({ obj, type, value }: TransformFnParams): unknown => {
					if (type !== TransformationType.PLAIN_TO_CLASS) {
						return value;
					}

					assertRequestWithoutPropertyKey(target, propertyKey, exposedName, obj);

					return Reflect.has(obj as object, exposedName) ? value : undefined;
				},
				{ toClassOnly: true },
			)(target, propertyKey);
		}
	});

	if (properties.isResponse !== undefined) {
		return;
	}

	if (Reflect.getMetadata?.(AUTO_DTO_RESPONSE_EXPOSURE_METADATA_KEY, target, propertyKey)) {
		return;
	}

	if (properties.isExpose === false) {
		Exclude()(target, propertyKey);
	} else {
		ApplyAutoExpose(target, propertyKey);
	}

	Reflect.defineMetadata?.(AUTO_DTO_RESPONSE_EXPOSURE_METADATA_KEY, true, target, propertyKey);
}

/**
 * Refuses a request that sends a renamed property under its property key, as that key is not a name on the wire.
 * class-transformer reads the key and the exposed name with the same key and source, so the refusal is the only way to keep the key from binding in either order.
 * A handler result reaches plain-to-class marked by `ClassTransformerSourceToExposed`, and a class instance is a row; any other object is a request, whatever its prototype, as a query parser may build one without `Object.prototype`.
 * A property key that another property is exposed under is a name on the wire, and it binds to that property.
 * @param {object} target - Decorated DTO prototype.
 * @param {string | symbol} propertyKey - Renamed property key.
 * @param {string} exposedName - Name the property is exposed under.
 * @param {unknown} request - Object plain-to-class reads.
 * @throws {ApiRequestValidationException} If a request owns the property key. The failure's `property` is the key, without its path.
 * @private
 */
function assertRequestWithoutPropertyKey(target: object, propertyKey: string | symbol, exposedName: string, request: unknown): void {
	if (typeof request !== "object" || request === null || !Object.hasOwn(request, propertyKey)) {
		return;
	}

	if (Object.hasOwn(request, EXPOSED_SOURCE_DTO_CONSTANT.MARKER) || isClassInstance(request)) {
		return;
	}

	const property: string = String(propertyKey);

	if (
		typeof propertyKey === "string" &&
		ClassTransformerGetStorage(target, propertyKey)
			.getExposedMetadatas(target.constructor)
			.some(({ options }: { options?: { name?: string } }): boolean => options?.name === property)
	) {
		return;
	}

	throw new ApiRequestValidationException([Object.assign(new ValidationError(), { children: [], constraints: { requestPropertyRenamed: `property ${property} should not exist, send it as ${exposedName}` }, property })]);
}

/**
 * Tells a class instance from a request object: its prototype owns a constructor other than `Object`.
 * @param {object} value - Object plain-to-class reads.
 * @returns {boolean} Whether the object is an instance of a class.
 * @private
 */
function isClassInstance(value: object): boolean {
	const prototype: null | object = Object.getPrototypeOf(value) as null | object;

	if (prototype === null) {
		return false;
	}

	const constructor: unknown = Object.getOwnPropertyDescriptor(prototype, "constructor")?.value;

	return typeof constructor === "function" && constructor !== Object;
}
