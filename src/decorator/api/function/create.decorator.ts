import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiFunctionCreateExecutorProperties, IApiFunctionProperties } from "@interface/decorator/api";
import type { TApiFunctionCreateProperties } from "@type/decorator/api/function";
import type { EntityManager, EntitySchema, Repository } from "typeorm";

import { EErrorStringAction } from "@enum/utility";
import { HttpException, InternalServerErrorException } from "@nestjs/common";
import { ErrorException } from "@utility/error-exception.utility";
import { ErrorString } from "@utility/error-string.utility";
import { LoggerUtility } from "@utility/logger.utility";

/**
 * Creates a decorator that adds entity creation functionality to a service method
 * @param {IApiFunctionProperties} properties - Configuration properties for the create function
 * @returns {(target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor} A decorator function that modifies the target method to handle entity creation
 */
// eslint-disable-next-line @elsikora/typescript/no-unnecessary-type-parameters
export function ApiFunctionCreate<E extends IApiBaseEntity>(properties: IApiFunctionProperties): (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor {
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
			properties: TApiFunctionCreateProperties<E>,
			eventManager?: EntityManager,
		): Promise<IApiBaseEntity> {
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
 * Executes the entity creation operation with error handling
 * @param {IApiFunctionCreateExecutorProperties<E>} options - Properties required for entity creation
 * @returns {Promise<E>} The created entity instance
 * @throws {InternalServerErrorException} If the creation operation fails
 */
async function executor<E extends IApiBaseEntity>(options: IApiFunctionCreateExecutorProperties<E>): Promise<E> {
	const { entity, eventManager, properties, repository }: IApiFunctionCreateExecutorProperties<E> = options;

	try {
		if (eventManager) {
			const eventRepository: Repository<E> = eventManager.getRepository<E>(entity as EntitySchema);

			return await eventRepository.save(properties);
		}

		return await repository.save(properties);
	} catch (error) {
		if (error instanceof HttpException) {
			throw error;
		}

		LoggerUtility.getLogger("ApiFunctionCreate").verbose(`Error creating entity ${String(entity.name)}:`, error);

		throw new InternalServerErrorException(
			ErrorString({
				entity: entity,
				type: EErrorStringAction.CREATING_ERROR,
			}),
		);
	}
}
