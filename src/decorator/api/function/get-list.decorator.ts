import { HttpException, InternalServerErrorException, NotFoundException } from "@nestjs/common";

import { EErrorStringAction } from "../../../enum";

import { ErrorException } from "../../../utility/error-exception.utility";
import { ErrorString } from "../../../utility/error-string.utility";

import type { IApiBaseEntity, IApiFunctionGetListExecutorProperties, IApiFunctionProperties, IApiGetListResponseResult } from "../../../interface";

import type { TApiFunctionGetListProperties } from "../../../type";
import type { Repository } from "typeorm";

async function executor<E extends IApiBaseEntity>(options: IApiFunctionGetListExecutorProperties<E>): Promise<IApiGetListResponseResult<E>> {
	const { entity, properties, repository }: IApiFunctionGetListExecutorProperties<E> = options;

	try {
		const [items, totalCount]: [Array<E>, number] = await repository.findAndCount(properties);

		if (items.length === 0) {
			throw new NotFoundException(
				ErrorString({
					entity: entity,
					type: EErrorStringAction.LIST_PAGE_NOT_FOUND,
				}),
			);
		}

		return {
			count: items.length,
			currentPage: properties.page,
			items,
			totalCount,
			totalPages: Math.ceil(totalCount / properties.limit),
		};
	} catch (error) {
		if (error instanceof HttpException) {
			throw error;
		}

		throw new InternalServerErrorException(
			ErrorString({
				entity: entity,
				type: EErrorStringAction.FETCHING_LIST_ERROR,
			}),
		);
	}
}

export function ApiFunctionGetList<E extends IApiBaseEntity>(properties: IApiFunctionProperties) {
	const { entity }: IApiFunctionProperties = properties;

	// eslint-disable-next-line @typescript-eslint/naming-convention
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
