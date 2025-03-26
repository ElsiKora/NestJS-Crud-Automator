import type { EntityManager, Repository } from "typeorm";
import type { EntitySchema } from "typeorm/index";

import type { IApiBaseEntity, IApiFunctionGetListExecutorProperties, IApiFunctionProperties, IApiGetListResponseResult } from "../../../interface";
import type { TApiFunctionGetListProperties } from "../../../type";

import { HttpException, InternalServerErrorException } from "@nestjs/common";

import { EErrorStringAction } from "../../../enum";
import { ErrorException } from "../../../utility/error-exception.utility";
import { ErrorString } from "../../../utility/error-string.utility";
import { LoggerUtility } from "../../../utility/logger.utility";

/**
 *
 * @param properties
 */
export function ApiFunctionGetList<E extends IApiBaseEntity>(properties: IApiFunctionProperties) {
	const { entity }: IApiFunctionProperties = properties;

	return function (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
		descriptor.value = async function (
			this: {
				repository: Repository<E>;
			},
			properties: TApiFunctionGetListProperties<E>,
			eventManager?: EntityManager,
		): Promise<IApiGetListResponseResult<E>> {
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
async function executor<E extends IApiBaseEntity>(options: IApiFunctionGetListExecutorProperties<E>): Promise<IApiGetListResponseResult<E>> {
	const { entity, eventManager, properties, repository }: IApiFunctionGetListExecutorProperties<E> = options;

	try {
		let items: Array<E>;
		let totalCount: number;

		if (eventManager) {
			const eventRepository: Repository<E> = eventManager.getRepository<E>(entity as EntitySchema);
			[items, totalCount] = await eventRepository.findAndCount(properties);
		} else {
			[items, totalCount] = await repository.findAndCount(properties);
		}

		return {
			count: items.length,
			// @ts-ignore
			// eslint-disable-next-line @elsikora/sonar/no-nested-conditional,@elsikora/unicorn/no-nested-ternary
			currentPage: items.length === 0 ? 0 : properties.skip ? Math.ceil(properties.skip / properties?.take) + 1 : 1,
			items,
			totalCount,
			// @ts-ignore
			totalPages: Math.ceil(totalCount / properties.take),
		};
	} catch (error) {
		if (error instanceof HttpException) {
			throw error;
		}

		LoggerUtility.getLogger("ApiFunctionGetList").verbose(`Error fetching list for entity ${String(entity.name)}:`, error);

		throw new InternalServerErrorException(
			ErrorString({
				entity: entity,
				type: EErrorStringAction.FETCHING_LIST_ERROR,
			}),
		);
	}
}
