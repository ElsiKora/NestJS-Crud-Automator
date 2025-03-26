import type { EntityManager, Repository } from "typeorm";
import type { EntitySchema } from "typeorm/index";

import type { IApiBaseEntity, IApiFunctionProperties } from "../../../interface";
import type { IApiFunctionGetManyExecutorProperties } from "../../../interface/decorator/api/function/get-many-executor-properties.interface";
import type { TApiFunctionGetManyProperties } from "../../../type";

import { HttpException, InternalServerErrorException, NotFoundException } from "@nestjs/common";

import { EErrorStringAction } from "../../../enum";
import { ErrorException } from "../../../utility/error-exception.utility";
import { ErrorString } from "../../../utility/error-string.utility";
import { LoggerUtility } from "../../../utility/logger.utility";

/**
 *
 * @param properties
 */
export function ApiFunctionGetMany<E extends IApiBaseEntity>(properties: IApiFunctionProperties) {
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
 *
 * @param options
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
