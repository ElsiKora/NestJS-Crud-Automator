import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiFunctionProperties, IApiFunctionUpdateExecutorProperties } from "@interface/decorator/api/function";
import type { TApiFunctionGetProperties, TApiFunctionUpdateCriteria, TApiFunctionUpdateProperties } from "@type/decorator/api/function";
import type { DeepPartial, EntityManager, EntitySchema, Repository } from "typeorm";

import { EErrorStringAction } from "@enum/utility";
import { HttpException, InternalServerErrorException } from "@nestjs/common";
import { ErrorException } from "@utility/error-exception.utility";
import { ErrorString } from "@utility/error-string.utility";
import { LoggerUtility } from "@utility/logger.utility";

import { ApiFunctionGet } from "./get.decorator";

/**
 * Creates a decorator that adds entity update functionality to a service method
 * @param {IApiFunctionProperties} properties - Configuration properties for the update function
 * @returns {(target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor} A decorator function that modifies the target method to handle entity updates
 */
// eslint-disable-next-line @elsikora/typescript/no-unnecessary-type-parameters
export function ApiFunctionUpdate<E extends IApiBaseEntity>(properties: IApiFunctionProperties): (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor {
	const { entity }: IApiFunctionProperties = properties;
	const getDecorator: (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor = ApiFunctionGet<E>({ entity });
	let getFunction: (properties: TApiFunctionGetProperties<E>, eventManager?: EntityManager) => Promise<E>;

	return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
		// eslint-disable-next-line @elsikora/sonar/void-use
		void target;
		// eslint-disable-next-line @elsikora/sonar/void-use
		void propertyKey;

		descriptor.value = async function (
			this: {
				repository: Repository<E>;
			},
			criteria: TApiFunctionUpdateCriteria<E>,
			properties: TApiFunctionUpdateProperties<E>,
			eventManager?: EntityManager,
		): Promise<E> {
			const repository: Repository<E> = this.repository;

			if (!repository) {
				throw ErrorException("Repository is not available in this context");
			}

			if (!getFunction) {
				const getDescriptor: TypedPropertyDescriptor<(properties: TApiFunctionGetProperties<E>, eventManager?: EntityManager) => Promise<E>> = {
					value: function () {
						return Promise.reject(ErrorException("Not implemented"));
					},
				};
				getDecorator(this, "get", getDescriptor);

				if (getDescriptor.value) {
					getFunction = getDescriptor.value.bind(this);
				} else {
					throw ErrorException("Get function is not properly decorated");
				}
			}

			return executor<E>({ criteria, entity, eventManager, getFunction, properties, repository });
		};

		return descriptor;
	};
}

/**
 * Executes the entity update operation with error handling
 * @param {IApiFunctionUpdateExecutorProperties<E>} options - Properties required for entity update
 * @returns {Promise<E>} The updated entity instance
 * @throws {InternalServerErrorException} If the update operation fails
 */
async function executor<E extends IApiBaseEntity>(options: IApiFunctionUpdateExecutorProperties<E>): Promise<E> {
	const { criteria, entity, eventManager, getFunction, properties, repository }: IApiFunctionUpdateExecutorProperties<E> = options;

	try {
		const existingEntity: E = await getFunction({ where: criteria }, eventManager);

		const updatedProperties: Partial<E> = {};

		const typedEntries: Array<[keyof E, E[keyof E]]> = Object.entries(properties) as Array<[keyof E, E[keyof E]]>;

		for (const [key, value] of typedEntries) {
			if (key in existingEntity) {
				updatedProperties[key] = value;
			}
		}

		const mergedEntity: DeepPartial<E> = {
			...existingEntity,
			...updatedProperties,
		};

		if (eventManager) {
			const eventRepository: Repository<E> = eventManager.getRepository<E>(entity as EntitySchema);

			return await eventRepository.save(mergedEntity);
		}

		return await repository.save(mergedEntity);
	} catch (error) {
		if (error instanceof HttpException) {
			throw error;
		}

		LoggerUtility.getLogger("ApiFunctionUpdate").verbose(`Error updating entity ${String(entity.name)}:`, error);

		throw new InternalServerErrorException(
			ErrorString({
				entity: entity,
				type: EErrorStringAction.UPDATING_ERROR,
			}),
		);
	}
}
