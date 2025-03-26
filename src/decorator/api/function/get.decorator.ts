import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiFunctionGetExecutorProperties, IApiFunctionProperties } from "@interface/decorator/api";
import type { TApiFunctionGetProperties } from "@type/decorator/api/function";
import type { EntityManager, EntitySchema, Repository } from "typeorm";

import { EErrorStringAction } from "@enum/utility";
import { HttpException, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { ErrorException } from "@utility/error-exception.utility";
import { ErrorString } from "@utility/error-string.utility";
import { LoggerUtility } from "@utility/logger.utility";

/**
 * Creates a decorator that adds single entity retrieval functionality to a service method
 * @param {IApiFunctionProperties} properties - Configuration properties for the get function
 * @returns {(target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor} A decorator function that modifies the target method to handle single entity retrieval
 */
// eslint-disable-next-line @elsikora/typescript/no-unnecessary-type-parameters
export function ApiFunctionGet<E extends IApiBaseEntity>(properties: IApiFunctionProperties): (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor {
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
			properties: TApiFunctionGetProperties<E>,
			eventManager?: EntityManager,
		): Promise<E> {
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
 * Executes the single entity retrieval operation with error handling
 * @param {IApiFunctionGetExecutorProperties<E>} options - Properties required for entity retrieval
 * @returns {Promise<E>} The retrieved entity instance
 * @throws {NotFoundException} If the entity is not found
 * @throws {InternalServerErrorException} If the retrieval operation fails
 */
async function executor<E extends IApiBaseEntity>(options: IApiFunctionGetExecutorProperties<E>): Promise<E> {
	const { entity, eventManager, properties, repository }: IApiFunctionGetExecutorProperties<E> = options;

	try {
		let item: E | null;

		if (eventManager) {
			const eventRepository: Repository<E> = eventManager.getRepository<E>(entity as EntitySchema);
			item = await eventRepository.findOne(properties);
		} else {
			item = await repository.findOne(properties);
		}

		if (!item) {
			throw new NotFoundException(ErrorString({ entity, type: EErrorStringAction.NOT_FOUND }));
		}

		return item;
	} catch (error) {
		if (error instanceof HttpException) {
			throw error;
		}

		LoggerUtility.getLogger("ApiFunctionGet").verbose(`Error fetching entity ${String(entity.name)}:`, error);

		throw new InternalServerErrorException(
			ErrorString({
				entity,
				type: EErrorStringAction.FETCHING_ERROR,
			}),
		);
	}
}
