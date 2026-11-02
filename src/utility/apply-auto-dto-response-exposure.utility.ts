import type { TApiPropertyBaseProperties } from "@type/decorator/api/property/base/properties.type";
import type { TransformFnParams } from "class-transformer";

import { ApiProperty } from "@nestjs/swagger";
import { ApplyAutoExpose } from "@utility/apply-auto-expose.utility";
import { ClassTransformerAssertExcludeUnnamed } from "@utility/class-transformer/assert-exclude-unnamed.utility";
import { ClassTransformerAutomatorTransform } from "@utility/class-transformer/automator-transform.utility";
import { ClassTransformerGetStorage } from "@utility/class-transformer/get-storage.utility";
import { DeferPropertyDecoratorExecution } from "@utility/defer-property-decorator-execution.utility";
import { Exclude, TransformationType } from "class-transformer";

const AUTO_DTO_RESPONSE_EXPOSURE_METADATA_KEY: string = "crud-automator:auto-dto-response-exposure";

/**
 * Applies class-transformer exposure to neutral manual DTO properties without marking them
 * as Swagger response-only fields.
 *
 * Explicit response-only properties (`isResponse: true`) still rely on the decorator-specific
 * response branch that uses `ApiResponseProperty()`.
 *
 * Every property also gets the check of its `@Expose` and exclude, and its schema publishes the exposed name; these wait for a microtask, as the other decorators of the property may run after this one.
 * A renamed property is read only from its exposed name: class-transformer would also bind a plain key equal to the property key under `exposeUnsetFields: false`.
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
			ClassTransformerAutomatorTransform(({ obj, type, value }: TransformFnParams): unknown => (type !== TransformationType.PLAIN_TO_CLASS || Reflect.has(obj as object, exposedName) ? value : undefined), { toClassOnly: true })(target, propertyKey);
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
