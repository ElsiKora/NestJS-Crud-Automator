import type { Repository } from "typeorm";

import type { IApiBaseEntity, IApiFunctionGetListExecutorProperties, IApiFunctionProperties, IApiGetListResponseResult } from "../../../interface";
import type { TApiFunctionGetListProperties } from "../../../type";

import { HttpException, InternalServerErrorException } from "@nestjs/common";

import { EErrorStringAction } from "../../../enum";
import { ErrorException } from "../../../utility/error-exception.utility";
import { ErrorString } from "../../../utility/error-string.utility";
import { LoggerUtility } from "../../../utility/logger.utility";

// eslint-disable-next-line @elsikora/typescript/no-unnecessary-type-parameters
export function ApiFunctionGetList<E extends IApiBaseEntity>(properties: IApiFunctionProperties) {
	const { entity }: IApiFunctionProperties = properties;

	return function (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
		descriptor.value = async function (
			this: {
				repository: Repository<E>;
			},
			properties: TApiFunctionGetListProperties<E>,
		): Promise<IApiGetListResponseResult<E>> {
			const repository: Repository<E> = this.repository;

			if (!repository) {
				throw ErrorException("Repository is not available in this context");
			}

			return executor<E>({ entity, properties, repository });
		};

		return descriptor;
	};
}

async function executor<E extends IApiBaseEntity>(options: IApiFunctionGetListExecutorProperties<E>): Promise<IApiGetListResponseResult<E>> {
	const { entity, properties, repository }: IApiFunctionGetListExecutorProperties<E> = options;

	try {
		const [items, totalCount]: [Array<E>, number] = await repository.findAndCount(properties);

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
