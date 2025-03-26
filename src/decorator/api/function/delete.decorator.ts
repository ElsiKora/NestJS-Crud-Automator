import type { EntityManager, EntitySchema, Repository } from "typeorm";

import type { IApiBaseEntity, IApiFunctionDeleteExecutorProperties, IApiFunctionProperties } from "../../../interface";
import type { TApiFunctionDeleteCriteria, TApiFunctionGetProperties } from "../../../type";

import { HttpException, InternalServerErrorException } from "@nestjs/common";

import { EErrorStringAction } from "../../../enum";
import { ErrorException } from "../../../utility/error-exception.utility";
import { ErrorString } from "../../../utility/error-string.utility";
import { LoggerUtility } from "../../../utility/logger.utility";

import { ApiFunctionGet } from "./get.decorator";

/**
 *
 * @param properties
 */
export function ApiFunctionDelete<E extends IApiBaseEntity>(properties: IApiFunctionProperties) {
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
			criteria: TApiFunctionDeleteCriteria<E>,
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

			return executor<E>({ criteria, entity, eventManager, getFunction, repository });
		};

		return descriptor;
	};
}

/**
 *
 * @param options
 */
async function executor<E extends IApiBaseEntity>(options: IApiFunctionDeleteExecutorProperties<E>): Promise<E> {
	const { criteria, entity, eventManager, getFunction, repository }: IApiFunctionDeleteExecutorProperties<E> = options;

	try {
		const existingEntity: E = await getFunction({ where: criteria });

		if (eventManager) {
			const eventRepository: Repository<E> = eventManager.getRepository<E>(entity as EntitySchema);

			return await eventRepository.remove(existingEntity);
		}

		return await repository.remove(existingEntity);
	} catch (error) {
		if (error instanceof HttpException) {
			throw error;
		}

		LoggerUtility.getLogger("ApiFunctionDelete").verbose(`Error deleting entity ${String(entity.name)}:`, error);

		throw new InternalServerErrorException(
			ErrorString({
				entity: entity,
				type: EErrorStringAction.UPDATING_ERROR,
			}),
		);
	}
}
