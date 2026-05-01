import type { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import type { Type } from "@nestjs/common";
import type { TManualDtoPropertyMetadata } from "@type/utility/dto/manual/property-metadata.type";

import { CONTEXTUAL_MANUAL_DTO_CONSTANT } from "@constant/dto/contextual-manual.constant";
import { CamelCaseString } from "@utility/camel-case-string.utility";
import { DtoAutoContextPop } from "@utility/dto/auto/context/pop.utility";
import { DtoAutoContextPush } from "@utility/dto/auto/context/push.utility";
import { GetManualDtoPropertyMetadata } from "@utility/dto/manual/property-metadata.utility";

const contextualManualDtoCache: WeakMap<Type<unknown>, Map<string, Type<unknown>>> = new WeakMap<Type<unknown>, Map<string, Type<unknown>>>();

/**
 * Generates a path-aware DTO wrapper for a nested manual DTO inside an auto-generated CRUD DTO.
 * The wrapper replays all original `ApiProperty*` decorators so Swagger, validation, and
 * class-transformer semantics remain intact while the schema name becomes context-specific.
 * @param {Type<unknown>} sourceDto - Source manual DTO class.
 * @param {EApiRouteType} method - Current auto DTO route method.
 * @param {EApiDtoType} dtoType - Current auto DTO type.
 * @param {string} parentDtoName - Parent generated DTO class name.
 * @param {string} propertyPathSegment - Current nested path segment to append.
 * @returns {Type<unknown>} Context-specific wrapper or the original class when replay metadata is unavailable.
 */
export function DtoGenerateContextualManualDto(sourceDto: Type<unknown>, method: EApiRouteType, dtoType: EApiDtoType, parentDtoName: string, propertyPathSegment: string): Type<unknown> {
	if (sourceDto === Object || IsContextualManualDto(sourceDto)) {
		return sourceDto;
	}

	const sourcePrototype: object = (sourceDto as unknown as { prototype: object }).prototype;
	const propertyMetadata: Map<string | symbol, TManualDtoPropertyMetadata> = GetManualDtoPropertyMetadata(sourcePrototype);

	if (propertyMetadata.size === 0) {
		return sourceDto;
	}

	// eslint-disable-next-line @elsikora/typescript/no-magic-numbers
	const parentDtoNameBase: string = parentDtoName.endsWith("DTO") ? parentDtoName.slice(0, -3) : parentDtoName;
	const className: string = `${parentDtoNameBase}${CamelCaseString(propertyPathSegment)}DTO`;
	const cached: Type<unknown> | undefined = getCachedContextualManualDto(sourceDto, className);

	if (cached) {
		return cached;
	}

	class GeneratedDTO {
		constructor() {
			for (const propertyKey of propertyMetadata.keys()) {
				Object.defineProperty(this, propertyKey, {
					// eslint-disable-next-line @elsikora/typescript/naming-convention
					configurable: true,
					// eslint-disable-next-line @elsikora/typescript/naming-convention
					enumerable: true,
					value: undefined,
					// eslint-disable-next-line @elsikora/typescript/naming-convention
					writable: true,
				});
			}
		}
	}

	Object.defineProperty(GeneratedDTO, "name", {
		value: className,
	});

	Reflect.defineMetadata?.(
		CONTEXTUAL_MANUAL_DTO_CONSTANT.METADATA_KEY,
		{
			dtoType,
			method,
			source: sourceDto,
		},
		GeneratedDTO,
	);

	cacheContextualManualDto(sourceDto, className, GeneratedDTO);
	DtoAutoContextPush(GeneratedDTO.prototype, method, dtoType);

	try {
		for (const [propertyKey, metadata] of propertyMetadata.entries()) {
			metadata.apply(GeneratedDTO.prototype, propertyKey);
		}
	} finally {
		DtoAutoContextPop(GeneratedDTO.prototype);
	}

	return GeneratedDTO;
}

/**
 * Returns whether a class was materialized as a context-specific wrapper around a manual DTO.
 * @param {unknown} value - Constructor candidate.
 * @returns {boolean} Whether the candidate is a generated contextual manual DTO.
 */
export function IsContextualManualDto(value: unknown): value is Type<unknown> {
	return typeof value === "function" && Boolean(Reflect.getMetadata?.(CONTEXTUAL_MANUAL_DTO_CONSTANT.METADATA_KEY, value));
}

/**
 * Stores a contextual wrapper in the generation cache.
 * @param {Type<unknown>} sourceDto - Source manual DTO class.
 * @param {string} className - Generated class name.
 * @param {Type<unknown>} generatedDto - Generated contextual wrapper.
 */
function cacheContextualManualDto(sourceDto: Type<unknown>, className: string, generatedDto: Type<unknown>): void {
	let dtoCache: Map<string, Type<unknown>> | undefined = contextualManualDtoCache.get(sourceDto);

	if (!dtoCache) {
		dtoCache = new Map<string, Type<unknown>>();
		contextualManualDtoCache.set(sourceDto, dtoCache);
	}

	dtoCache.set(className, generatedDto);
}

/**
 * Reads a cached contextual wrapper for the provided source DTO.
 * @param {Type<unknown>} sourceDto - Source manual DTO class.
 * @param {string} className - Generated class name.
 * @returns {Type<unknown> | undefined} Cached wrapper when available.
 */
function getCachedContextualManualDto(sourceDto: Type<unknown>, className: string): Type<unknown> | undefined {
	return contextualManualDtoCache.get(sourceDto)?.get(className);
}
