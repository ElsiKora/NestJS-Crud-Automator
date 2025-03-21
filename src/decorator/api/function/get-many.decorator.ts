import type { Repository } from "typeorm";

import type { IApiBaseEntity, IApiFunctionProperties } from "../../../interface";
import type { IApiFunctionGetManyExecutorProperties } from "../../../interface/decorator/api/function/get-many-executor-properties.interface";
import type { TApiFunctionGetManyProperties } from "../../../type";

import { HttpException, InternalServerErrorException, NotFoundException } from "@nestjs/common";

import { EErrorStringAction } from "../../../enum";
import { ErrorException } from "../../../utility/error-exception.utility";
import { ErrorString } from "../../../utility/error-string.utility";

// eslint-disable-next-line @elsikora/typescript/no-unnecessary-type-parameters
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
		): Promise<Array<E>> {
			const repository: Repository<E> = this.repository;

			if (!repository) {
				throw ErrorException("Repository is not available in this context");
			}

			return executor<E>({ entity, properties, repository });
		};

		return descriptor;
	};
}

async function executor<E extends IApiBaseEntity>(options: IApiFunctionGetManyExecutorProperties<E>): Promise<Array<E>> {
	const { entity, properties, repository }: IApiFunctionGetManyExecutorProperties<E> = options;

	try {
		const items: Array<E> = await repository.find(properties);

		if (items.length === 0) {
			throw new NotFoundException(ErrorString({ entity, type: EErrorStringAction.NOT_FOUND }));
		}

		return items;
	} catch (error) {
		if (error instanceof HttpException) {
			throw error;
		}

		throw new InternalServerErrorException(
			ErrorString({
				entity,
				type: EErrorStringAction.FETCHING_ERROR,
			}),
		);
	}
}
