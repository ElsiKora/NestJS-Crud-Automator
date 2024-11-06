import { HttpException, InternalServerErrorException } from "@nestjs/common";

import { EErrorStringAction } from "../../../enum";

import { ErrorException } from "../../../utility/error-exception.utility";
import { ErrorString } from "../../../utility/error-string.utility";

import type { IApiBaseEntity, IApiFunctionCreateExecutorProperties, IApiFunctionProperties } from "../../../interface";
import type { TApiFunctionCreateProperties } from "../../../type";

import type { Repository } from "typeorm";

async function executor<E extends IApiBaseEntity>(options: IApiFunctionCreateExecutorProperties<E>): Promise<E> {
	const { entity, properties, repository }: IApiFunctionCreateExecutorProperties<E> = options;

	try {
		return await repository.save(properties);
	} catch (error) {
		if (error instanceof HttpException) {
			throw error;
		}

		throw new InternalServerErrorException(
			ErrorString({
				entity: entity,
				type: EErrorStringAction.CREATING_ERROR,
			}),
		);
	}
}

export function ApiFunctionCreate<E extends IApiBaseEntity>(properties: IApiFunctionProperties) {
	const { entity }: IApiFunctionProperties = properties;

	return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
		void target;
		void propertyKey;

		descriptor.value = async function (
			this: {
				repository: Repository<E>;
			},
			properties: TApiFunctionCreateProperties<E>,
		): Promise<IApiBaseEntity> {
			const repository: Repository<E> = this.repository;

			if (!repository) {
				throw ErrorException("Repository is not available in this context");
			}

			return executor<E>({ entity, properties, repository });
		};

		return descriptor;
	};
}
