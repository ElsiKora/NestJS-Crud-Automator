import type { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
import type { Type } from "@nestjs/common";
import type { TApiEntityReference } from "@type/api-entity-reference.type";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";
import type { TApiPropertyCopyProperties } from "@type/decorator/api/property/copy-properties.type";

import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { applyDecorators } from "@nestjs/common";
import { DtoBuildDecorator } from "@utility/dto/build-decorator.utility";
import { DtoGenerateDynamic } from "@utility/dto/generate/dynamic.utility";
import { DtoSchemaNameStripSuffix } from "@utility/dto/schema-name/strip-suffix.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { QueueAutoContextRetry } from "@utility/queue-auto-context-retry.utility";
import { ResolveDecoratorContext } from "@utility/resolve";
import { WithResolvedPropertyEntity } from "@utility/with-resolved-property-entity.utility";

/**
 * Copied decorators per host DTO class, route, DTO type and host property, so applying one copy to one host property again reuses the nested generated DTOs.
 */
const copiedDecoratorCache: WeakMap<object, Map<string, { decorators: Array<PropertyDecorator>; guard: unknown; metadata: unknown }>> = new WeakMap<object, Map<string, { decorators: Array<PropertyDecorator>; guard: unknown; metadata: unknown }>>();

/**
 * Copies every generated decorator (Swagger metadata, validators, transformers, DTO hooks) from an entity property
 * onto a manual DTO property.
 *
 * Supports:
 * - Direct entity references or lazy factories to break circular imports
 * - Overriding the source route/method (`method` + `dtoType`)
 * - Guard-aware decorator copies (pass the guard used during auto DTO generation)
 * - Metadata extension (supply `metadata` to merge additional describe fields)
 * - Auto context resolution for nested DTOs generated through the CRUD automator pipeline
 *
 * A nested DTO that the copy generates (a relation or a dynamic object variant) is named after the host DTO and the host property:
 * `<Host><Property>DTO` or `<Host><Property><Variant>DTO`, where `<Host>` is the host class name without a trailing `DTO` in any case
 * and `<Property>` is the decorated property of the host, so one entity property copied into two host properties gets two names.
 * @example
 * ```ts
 * class DepositCallbackRequestBodyDto {
 *   @ApiPropertyCopy({
 *     entity: () => Deposit,
 *     propertyName: "status",
 *     method: EApiRouteType.GET,
 *     dtoType: EApiDtoType.RESPONSE,
 *   })
 *   status!: EDepositStatus;
 *
 *   @ApiPropertyCopy({
 *     entity: () => Deposit,
 *     propertyName: "amount",
 *     shouldAutoResolveContext: true,
 *   })
 *   amount!: number;
 * }
 * ```
 * @template E
 * @param {TApiPropertyCopyProperties<E>} properties - Configuration describing which entity property to mirror.
 * @returns {PropertyDecorator} Property decorator that applies copied metadata.
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/api-reference/decorators/api-property/api-property-copy | API Reference - ApiPropertyCopy}
 */
export function ApiPropertyCopy<E>(properties: TApiPropertyCopyProperties<E>): PropertyDecorator {
	const { dtoType, entity, guard, metadata, method, propertyName, shouldAutoResolveContext }: TApiPropertyCopyProperties<E> = properties;

	return function (target: object, key: string | symbol): void {
		const executeWithEntity = (decoratorTarget: object): void => {
			WithResolvedPropertyEntity(entity, "ApiPropertyCopy", (resolvedEntity: TApiEntityReference) => {
				executeWithContext(decoratorTarget, resolvedEntity as Type<E>);
			});
		};

		const executeWithContext = (decoratorTarget: object, resolvedEntity: Type<E>): void => {
			const shouldUseAutoContext: boolean = shouldAutoResolveContext ?? false;
			const resolvedContext: { dtoType: EApiDtoType; method: EApiRouteType } | undefined = ResolveDecoratorContext(decoratorTarget, method, dtoType, shouldUseAutoContext);

			if (!resolvedContext) {
				if (shouldUseAutoContext) {
					QueueAutoContextRetry(decoratorTarget, () => {
						executeWithEntity(decoratorTarget);
					});

					return;
				}

				throw ErrorException("ApiPropertyCopy requires method and dtoType or a valid autoResolveContext.");
			}

			const { dtoType: resolvedDtoType, method: resolvedMethod }: { dtoType: EApiDtoType; method: EApiRouteType } = resolvedContext;
			const entityMetadata: IApiEntity<E> = GenerateEntityInformation(resolvedEntity);

			if (!entityMetadata?.columns) {
				throw ErrorException(`Entity metadata for ${resolvedEntity.name} not found or invalid`);
			}

			const column: IApiEntityColumn<E> | undefined = entityMetadata.columns.find((entityColumn: IApiEntityColumn<E>) => entityColumn.name == propertyName);

			if (!column) {
				throw ErrorException(`Property ${String(propertyName)} not found in entity ${resolvedEntity.name}`);
			}

			let propertyMetadata: TApiPropertyDescribeProperties = column.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] as TApiPropertyDescribeProperties;

			if (!propertyMetadata) {
				throw ErrorException(`Metadata for property ${String(propertyName)} in entity ${resolvedEntity.name} not found`);
			}

			if (metadata) {
				propertyMetadata = { ...propertyMetadata, ...(metadata as TApiPropertyDescribeProperties) } as TApiPropertyDescribeProperties;
			}

			const host: Type<unknown> = (typeof decoratorTarget === "function" ? decoratorTarget : decoratorTarget.constructor) as Type<unknown>;
			const hostPropertyName: string = String(key);
			const cacheKey: string = `${resolvedMethod}:${resolvedDtoType}:${hostPropertyName}`;
			const cached: { decorators: Array<PropertyDecorator>; guard: unknown; metadata: unknown } | undefined = copiedDecoratorCache.get(host)?.get(cacheKey);

			if (cached && cached.guard === guard && cached.metadata === metadata) {
				applyDecorators(...cached.decorators)(target, key);

				return;
			}

			const dtoNameBase: string = DtoSchemaNameStripSuffix(host.name);
			const generatedDTOs: Record<string, Type<unknown>> | undefined = DtoGenerateDynamic(resolvedMethod, propertyMetadata, entityMetadata, resolvedDtoType, hostPropertyName, guard, dtoNameBase, host.name);

			const decorators: Array<PropertyDecorator> | undefined = DtoBuildDecorator(resolvedMethod, propertyMetadata, entityMetadata, resolvedDtoType, propertyName as string, guard, generatedDTOs, dtoNameBase, hostPropertyName, host.name);

			if (!decorators || decorators.length === 0) {
				throw ErrorException(`No decorators generated for property ${String(propertyName)} in entity ${resolvedEntity.name}`);
			}

			let hostCache: Map<string, { decorators: Array<PropertyDecorator>; guard: unknown; metadata: unknown }> | undefined = copiedDecoratorCache.get(host);

			if (!hostCache) {
				hostCache = new Map<string, { decorators: Array<PropertyDecorator>; guard: unknown; metadata: unknown }>();
				copiedDecoratorCache.set(host, hostCache);
			}

			hostCache.set(cacheKey, { decorators, guard, metadata });
			applyDecorators(...decorators)(target, key);
		};

		if (shouldAutoResolveContext) {
			QueueAutoContextRetry(target, () => {
				executeWithEntity(target);
			});

			return;
		}

		executeWithEntity(target);
	};
}
