import type { Repository } from "typeorm";

import type { IApiBaseEntity, IApiFunctionGetExecutorProperties, IApiFunctionProperties } from "../../../interface";
import type { TApiFunctionGetProperties } from "../../../type";

import { HttpException, InternalServerErrorException, NotFoundException } from "@nestjs/common";

import { EErrorStringAction } from "../../../enum";
import { ErrorException } from "../../../utility/error-exception.utility";
import { ErrorString } from "../../../utility/error-string.utility";

export function ApiFunctionGet<E extends IApiBaseEntity>(properties: IApiFunctionProperties) {
	const { entity }: IApiFunctionProperties = properties;

	return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
		void target;
		void propertyKey;

		descriptor.value = async function (
			this: {
				repository: Repository<E>;
			},
			properties: TApiFunctionGetProperties<E>,
		): Promise<E> {
			const repository: Repository<E> = this.repository;

			if (!repository) {
				throw ErrorException("Repository is not available in this context");
			}

			return executor<E>({ entity, properties, repository });
		};

		return descriptor;
	};
}

async function executor<E extends IApiBaseEntity>(options: IApiFunctionGetExecutorProperties<E>): Promise<E> {
	const { entity, properties, repository }: IApiFunctionGetExecutorProperties<E> = options;

	try {
		const item: E | null = await repository.findOne(properties);

		if (!item) {
			throw new NotFoundException(ErrorString({ entity, type: EErrorStringAction.NOT_FOUND }));
		}

		return item;
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
