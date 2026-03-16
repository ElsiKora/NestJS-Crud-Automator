import type { TApiPropertyBaseProperties } from "@type/decorator/api/property/base/properties.type";

import { EApiDtoType } from "@enum/decorator/api";
import { RegisterAutoDtoContextListener } from "@utility/auto-dto-context-queue.utility";
import { GetAutoDtoContext } from "@utility/get/auto-dto-context.utility";
import { Exclude, Expose } from "class-transformer";

const AUTO_DTO_RESPONSE_EXPOSURE_METADATA_KEY: string = "crud-automator:auto-dto-response-exposure";

/**
 * Applies runtime-only response exposure to nested manual DTO properties once they are used
 * inside an auto-generated response DTO context.
 * @param {object} target - Decorated DTO prototype.
 * @param {string | symbol} propertyKey - Decorated property key.
 * @param {TApiPropertyBaseProperties} properties - Crud-automator property options.
 */
export function ApplyAutoDtoResponseExposure(target: object, propertyKey: string | symbol, properties: { isExpose?: boolean } & Pick<TApiPropertyBaseProperties, "isResponse">): void {
	if (!target || properties.isResponse !== undefined) {
		return;
	}

	const applyExposure = (): boolean => {
		const context: ReturnType<typeof GetAutoDtoContext> = GetAutoDtoContext(target);

		if (context?.dtoType !== EApiDtoType.RESPONSE) {
			return true;
		}

		if (Reflect.getMetadata?.(AUTO_DTO_RESPONSE_EXPOSURE_METADATA_KEY, target, propertyKey)) {
			return false;
		}

		if (properties.isExpose === false) {
			Exclude()(target, propertyKey);
		} else {
			Expose()(target, propertyKey);
		}

		Reflect.defineMetadata?.(AUTO_DTO_RESPONSE_EXPOSURE_METADATA_KEY, true, target, propertyKey);

		return false;
	};

	if (applyExposure()) {
		RegisterAutoDtoContextListener(target, applyExposure);
	}
}
