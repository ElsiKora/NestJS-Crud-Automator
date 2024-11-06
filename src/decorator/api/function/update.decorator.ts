import { HttpException, InternalServerErrorException } from "@nestjs/common";

import { EErrorStringAction } from "../../../enum";

import { ErrorException } from "../../../utility/error-exception.utility";
import { ErrorString } from "../../../utility/error-string.utility";

import { ApiFunctionGet } from "./get.decorator";

import type { IApiBaseEntity, IApiFunctionProperties } from "../../../interface";
import type { IApiFunctionUpdateExecutorProperties } from "../../../interface/decorator/api/function/update-executor-properties.type";
import type { TApiFunctionGetProperties, TApiFunctionUpdateCriteria, TApiFunctionUpdateProperties } from "../../../type";

import type { DeepPartial, Repository } from "typeorm";

async function executor<E extends IApiBaseEntity>(options: IApiFunctionUpdateExecutorProperties<E>): Promise<E> {
	const { criteria, entity, getFunction, properties, repository }: IApiFunctionUpdateExecutorProperties<E> = options;

	try {
		const existingEntity: E = await getFunction({ where: criteria });

		const updatedProperties: Partial<E> = {};

		const typedEntries: Array<[keyof E, E[keyof E]]> = Object.entries(properties) as Array<[keyof E, E[keyof E]]>;

		for (const [key, value] of typedEntries) {
			if (key in existingEntity) {
				updatedProperties[key] = value;
			}
		}

		const mergedEntity: DeepPartial<E> = {
			...existingEntity,
			...updatedProperties,
		};

		return await repository.save(mergedEntity);
	} catch (error) {
		console.log(error);

		if (error instanceof HttpException) {
			throw error;
		}

		throw new InternalServerErrorException(
			ErrorString({
				entity: entity,
				type: EErrorStringAction.UPDATING_ERROR,
			}),
		);
	}
}

export function ApiFunctionUpdate<E extends IApiBaseEntity>(properties: IApiFunctionProperties) {
	const { entity }: IApiFunctionProperties = properties;
	const getDecorator: (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor = ApiFunctionGet<E>({ entity });
	let getFunction: (properties: TApiFunctionGetProperties<E>) => Promise<E>;

	return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
		void target;
		void propertyKey;

		descriptor.value = async function (
			this: {
				repository: Repository<E>;
			},
			criteria: TApiFunctionUpdateCriteria<E>,
			properties: TApiFunctionUpdateProperties<E>,
		): Promise<E> {
			const repository: Repository<E> = this.repository;

			if (!repository) {
				throw ErrorException("Repository is not available in this context");
			}

			if (!getFunction) {
				const getDescriptor: TypedPropertyDescriptor<(properties: TApiFunctionGetProperties<E>) => Promise<E>> = {
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

			return executor<E>({ criteria, entity, getFunction, properties, repository });
		};

		return descriptor;
	};
}
