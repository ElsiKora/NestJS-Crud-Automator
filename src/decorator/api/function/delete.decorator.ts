import { HttpException, InternalServerErrorException } from "@nestjs/common";

import { EErrorStringAction } from "../../../enum";

import { ErrorException, ErrorString } from "../../../utility";

import { ApiFunctionGet } from "./get.decorator";

import type { IApiBaseEntity } from "../../../interface";

import type { TApiFunctionGetProperties } from "../../../type";
import type { Repository } from "typeorm";

async function executor<E extends IApiBaseEntity>(repository: Repository<E>, entityType: new () => E, id: number | string, getFunction: (id: string, properties?: TApiFunctionGetProperties<E>) => Promise<E>): Promise<void> {
	try {
		const entity: E = await getFunction(id.toString());

		await repository.remove(entity);
	} catch (error) {
		console.log(error);

		if (error instanceof HttpException) {
			throw error;
		}

		throw new InternalServerErrorException(
			ErrorString({
				entity: entityType,
				type: EErrorStringAction.DELETING_ERROR,
			}),
		);
	}
}

export function ApiFunctionDelete<E extends IApiBaseEntity>(options: { model: new () => E }) {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	return function (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
		const getDecorator: (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor = ApiFunctionGet({ model: options.model });
		let getFunction: (id: string, properties?: TApiFunctionGetProperties<E>) => Promise<E>;

		descriptor.value = async function (
			this: {
				repository: Repository<E>;
			},
			id: number | string,
		): Promise<void> {
			const repository: Repository<E> = this.repository;

			if (!repository) {
				throw ErrorException("Repository is not available in this context");
			}

			if (!getFunction) {
				const getDescriptor: TypedPropertyDescriptor<(id: string, properties?: TApiFunctionGetProperties<E>) => Promise<E>> = {
					value: function () {
						return Promise.reject(new Error("Not implemented"));
					},
				};
				getDecorator(this, "get", getDescriptor);

				if (getDescriptor.value) {
					getFunction = getDescriptor.value.bind(this);
				} else {
					throw ErrorException("Get function is not properly decorated");
				}
			}

			return executor<E>(repository, options.model, id, getFunction);
		};

		return descriptor;
	};
}
