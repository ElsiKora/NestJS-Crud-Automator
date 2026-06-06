import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerProperties, IApiControllerPropertiesRouteBaseRelationsRequest } from "@interface/decorator/api";
import type { TApiControllerMethod } from "@type/class";
import type { TApiControllerGetListQuery } from "@type/decorator/api/controller";
import type { TApiFunctionGetProperties } from "@type/decorator/api/function";
import type { TApiServiceKeys } from "@type/decorator/api/service";
import type { DeepPartial, FindOptionsRelations } from "typeorm";

import { ApiServiceBase } from "@class/api/service-base.class";
import { EApiControllerRelationReferenceShape } from "@enum/decorator/api";
import { EErrorStringAction } from "@enum/utility";
import { BadRequestException, HttpStatus } from "@nestjs/common";
import { ErrorException } from "@utility/error/exception.utility";
import { ErrorString } from "@utility/error/string.utility";
import { GetEntityColumns } from "@utility/get/entity-columns.utility";

/**
 * Manages loading related entities when processing API requests.
 * Determines which relations to load based on request load include,
 * finds the appropriate service for each relation, and loads the related entities.
 * @param {TApiControllerMethod<E>} controllerMethod - The controller method with access to service instances
 * @param {IApiControllerProperties<E>} properties - Controller configuration properties
 * @param {IApiControllerPropertiesRouteBaseRelationsRequest<E> | undefined} relationConfig - Configuration for relation loading
 * @param {DeepPartial<E> | Partial<E> | TApiControllerGetListQuery<E>} parameters - The request parameters containing relation IDs
 * @returns {Promise<void>} A promise that resolves when all relations are loaded
 * @throws {BadRequestException} When the request relation reference shape is invalid
 * @throws {Error} When service configuration is invalid or services are not found
 * @template E - The entity type
 */
export async function ApiControllerHandleRequestRelations<E extends IApiBaseEntity>(controllerMethod: TApiControllerMethod<E>, properties: IApiControllerProperties<E>, relationConfig: IApiControllerPropertiesRouteBaseRelationsRequest<E> | undefined, parameters: DeepPartial<E> | Partial<E> | TApiControllerGetListQuery<E>): Promise<void> {
	const loadConfig: IApiControllerPropertiesRouteBaseRelationsRequest<E>["load"] | undefined = relationConfig?.load;
	const referenceConfig: IApiControllerPropertiesRouteBaseRelationsRequest<E>["reference"] | undefined = relationConfig?.reference;

	if (!loadConfig) {
		return;
	}

	if (!referenceConfig) {
		throw ErrorException("Request relation reference config is required when relation loading is configured");
	}

	validateReferenceConfig(referenceConfig);

	const relationNames: Set<string> = new Set<string>(GetEntityColumns<E>({ entity: properties.entity, shouldTakeRelationsOnly: true }).filter((propertyName: keyof E): propertyName is keyof E & string => typeof propertyName === "string"));
	const parametersRecord: Record<string, unknown> = parameters as Record<string, unknown>;

	for (const [propertyName, includeValue] of getIncludedRelationEntries(loadConfig.include)) {
		validateIncludedRelationKey(propertyName, relationNames);

		if (!Object.prototype.hasOwnProperty.call(parametersRecord, propertyName) || parametersRecord[propertyName] === undefined || parametersRecord[propertyName] === null || includeValue === false) {
			continue;
		}

		const nestedInclude: FindOptionsRelations<IApiBaseEntity> | undefined = resolveNestedInclude(propertyName, includeValue);
		const serviceName: keyof TApiServiceKeys<E> = resolveRelationServiceName(propertyName, loadConfig.services);
		const service: unknown = controllerMethod[serviceName];

		if (!service) {
			throw ErrorException(`Service ${serviceName as string} not found in controller`);
		}

		if (!(service instanceof ApiServiceBase)) {
			throw ErrorException(`Service ${serviceName as string} is not an instance of ApiServiceBase`);
		}

		const referenceKey: string = referenceConfig.key ?? "id";
		const referenceValue: unknown = resolveRelationReferenceValue(properties.entity, propertyName, parametersRecord[propertyName], referenceConfig.shape, referenceKey);

		const requestProperties: TApiFunctionGetProperties<IApiBaseEntity> = {
			where: {
				[referenceKey]: referenceValue,
			},
		};

		if (nestedInclude) {
			requestProperties.relations = nestedInclude;
		}

		if (loadConfig.relationLoadStrategy) {
			requestProperties.relationLoadStrategy = loadConfig.relationLoadStrategy;
		}

		const entity: IApiBaseEntity = await (service as ApiServiceBase<IApiBaseEntity>).get(requestProperties);

		if (!entity) {
			throw ErrorException(`Service ${serviceName as string} returned an empty relation entity`);
		}

		parametersRecord[propertyName] = entity;
	}
}

/**
 * Builds a canonical bad request exception for invalid relation references.
 * @param {IApiBaseEntity} entity - Parent entity metadata.
 * @param {string} propertyName - Relation property name.
 * @param {EApiControllerRelationReferenceShape} expectedShape - Expected reference shape.
 * @param {string} referenceKey - Expected object reference key.
 * @returns {BadRequestException} Structured bad request exception.
 */
function buildRelationReferenceBadRequestException(entity: IApiBaseEntity, propertyName: string, expectedShape: EApiControllerRelationReferenceShape, referenceKey: string): BadRequestException {
	return new BadRequestException({
		details: {
			expectedShape,
			propertyName,
			referenceKey,
		},
		error: "Bad Request",
		message: ErrorString({ entity, type: EErrorStringAction.INVALID_REFERENCE }),
		statusCode: HttpStatus.BAD_REQUEST,
	});
}

/**
 * Returns direct relation include entries from the TypeORM-shaped include map.
 * @param {unknown} include - Request include map.
 * @returns {Array<[string, unknown]>} Direct include entries.
 */
function getIncludedRelationEntries(include: unknown): Array<[string, unknown]> {
	if (include === null || typeof include !== "object" || Array.isArray(include)) {
		throw ErrorException("Request relation load include must be an object");
	}

	return Object.entries(include as Record<string, unknown>);
}

/**
 * Converts a direct include value into nested TypeORM relations for relation service get calls.
 * @param {string} propertyName - Relation property name.
 * @param {unknown} includeValue - Direct include value.
 * @returns {FindOptionsRelations<IApiBaseEntity> | undefined} Nested relation include map.
 */
function resolveNestedInclude(propertyName: string, includeValue: unknown): FindOptionsRelations<IApiBaseEntity> | undefined {
	if (includeValue === true || includeValue === false) {
		return undefined;
	}

	if (includeValue === null || typeof includeValue !== "object") {
		throw ErrorException(`Invalid include value for relation ${propertyName}`);
	}

	return includeValue;
}

/**
 * Resolves the relation reference value according to the configured request shape.
 * @param {IApiBaseEntity} entity - Parent entity metadata.
 * @param {string} propertyName - Relation property name used in validation details.
 * @param {unknown} value - Incoming scalar or object reference value.
 * @param {EApiControllerRelationReferenceShape} shape - Expected relation reference shape.
 * @param {string} referenceKey - Property key to read from object references.
 * @returns {unknown} Reference value used to load the related entity.
 */
function resolveRelationReferenceValue(entity: IApiBaseEntity, propertyName: string, value: unknown, shape: EApiControllerRelationReferenceShape, referenceKey: string): unknown {
	if (shape === EApiControllerRelationReferenceShape.SCALAR) {
		if (value !== null && typeof value === "object") {
			throw buildRelationReferenceBadRequestException(entity, propertyName, shape, referenceKey);
		}

		return value;
	}

	if (value === null || typeof value !== "object" || !(referenceKey in value)) {
		throw buildRelationReferenceBadRequestException(entity, propertyName, shape, referenceKey);
	}

	const referenceValue: unknown = (value as Record<string, unknown>)[referenceKey];

	if (referenceValue === null || referenceValue === undefined) {
		throw buildRelationReferenceBadRequestException(entity, propertyName, shape, referenceKey);
	}

	return referenceValue;
}

/**
 * Resolves the controller property name for a direct request relation service.
 * @param {string} propertyName - Relation property name.
 * @param {NonNullable<IApiControllerPropertiesRouteBaseRelationsRequest<E>["load"]>["services"]} services - Optional service override map.
 * @returns {keyof TApiServiceKeys<E>} Controller service property name.
 * @template E - Entity type.
 */
function resolveRelationServiceName<E extends IApiBaseEntity>(propertyName: string, services: NonNullable<IApiControllerPropertiesRouteBaseRelationsRequest<E>["load"]>["services"]): keyof TApiServiceKeys<E> {
	const serviceName: string = services?.[propertyName] ?? `${propertyName}Service`;

	if (!serviceName) {
		throw ErrorException(`Service name not specified for property ${propertyName}`);
	}

	return serviceName as keyof TApiServiceKeys<E>;
}

/**
 * Ensures a configured include key is a direct relation on the entity.
 * @param {string} propertyName - Include property name.
 * @param {Set<string>} relationNames - Direct entity relation names.
 * @returns {void}
 */
function validateIncludedRelationKey(propertyName: string, relationNames: Set<string>): void {
	if (!relationNames.has(propertyName)) {
		throw ErrorException(`Relation ${propertyName} is not a direct relation on the entity`);
	}
}

/**
 * Ensures request relation reference settings are valid route configuration.
 * @param {IApiControllerPropertiesRouteBaseRelationsRequest<IApiBaseEntity>["reference"]} referenceConfig - Request relation reference config.
 * @returns {void}
 */
function validateReferenceConfig(referenceConfig: IApiControllerPropertiesRouteBaseRelationsRequest<IApiBaseEntity>["reference"]): void {
	if (!Object.values(EApiControllerRelationReferenceShape).includes(referenceConfig.shape)) {
		throw ErrorException("Request relation reference shape must be OBJECT or SCALAR");
	}

	if (referenceConfig.key?.length === 0) {
		throw ErrorException("Request relation reference key must not be empty");
	}
}
