import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiFunctionGetManyExecutorProperties, IApiFunctionProperties } from "@interface/decorator/api";
import type { TApiFunctionGetManyProperties } from "@type/decorator/api/function";
import type { EntityManager, EntitySchema, Repository } from "typeorm";

import { EErrorStringAction } from "@enum/utility";
import { HttpException, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { ErrorException } from "@utility/error-exception.utility";
import { ErrorString } from "@utility/error-string.utility";
import { LoggerUtility } from "@utility/logger.utility";

/**
 * Creates a decorator that adds functionality to retrieve multiple entities to a service method
 * @param {IApiFunctionProperties} properties - Configuration properties for the get-many function
 * @returns {(target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor} A decorator function that modifies the target method to handle retrieving multiple entities
 */
// eslint-disable-next-line @elsikora/typescript/no-unnecessary-type-parameters
export function ApiFunctionGetMany<E extends IApiBaseEntity>(properties: IApiFunctionProperties): (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor {
	const { entity }: IApiFunctionProperties = properties;

	return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
		// eslint-disable-next-line @elsikora/sonar/void-use
		void target;
		// eslint-disable-next-line @elsikora/sonar/void-use
		void propertyKey;

		descriptor.value = async function (
			this: {
				repository: Repository<E>;
			},
			properties: TApiFunctionGetManyProperties<E>,
			eventManager?: EntityManager,
		): Promise<Array<E>> {
			const repository: Repository<E> = this.repository;

			if (!repository) {
				throw ErrorException("Repository is not available in this context");
			}

			return executor<E>({ entity, eventManager, properties, repository });
		};

		return descriptor;
	};
}

/**
 * Executes the retrieval of multiple entities with error handling
 * @param {IApiFunctionGetManyExecutorProperties<E>} options - Properties required for retrieving multiple entities
 * @returns {Promise<Array<E>>} An array of retrieved entity instances
 * @throws {NotFoundException} If no entities are found
 * @throws {InternalServerErrorException} If the retrieval operation fails
 */
async function executor<E extends IApiBaseEntity>(options: IApiFunctionGetManyExecutorProperties<E>): Promise<Array<E>> {
	const { entity, eventManager, properties, repository }: IApiFunctionGetManyExecutorProperties<E> = options;

	try {
		let items: Array<E>;

		if (eventManager) {
			const eventRepository: Repository<E> = eventManager.getRepository<E>(entity as EntitySchema);
			items = await eventRepository.find(properties);
		} else {
			items = await repository.find(properties);
		}

		if (items.length === 0) {
			throw new NotFoundException(ErrorString({ entity, type: EErrorStringAction.NOT_FOUND }));
		}

		return items;
	} catch (error) {
		if (error instanceof HttpException) {
			throw error;
		}

		LoggerUtility.getLogger("ApiFunctionGetMany").verbose(`Error fetching multiple entity ${String(entity.name)}:`, error);

		throw new InternalServerErrorException(
			ErrorString({
				entity,
				type: EErrorStringAction.FETCHING_ERROR,
			}),
		);
	}
}
