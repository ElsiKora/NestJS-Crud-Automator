import { HttpException, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { Like } from "typeorm";

import { EErrorStringAction } from "../../../enum";
import { ErrorString } from "../../../utility";

import type { TApiFunctionGetProperties } from "../../../type";

import type { BaseEntity, FindManyOptions, FindOneOptions, FindOptionsRelations, Repository } from "typeorm";

async function executor<E extends BaseEntity>(repository: Repository<E>, model: new () => E, filter: FindOneOptions<E>): Promise<E> {
	console.log("FILTER", filter);

	try {
		const item: E | null = await repository.findOne(filter);

		if (!item) {
			throw new NotFoundException(ErrorString({ entity: model, type: EErrorStringAction.NOT_FOUND }));
		}

		return item;
	} catch (error) {
		console.log("FUCKIGH", error);

		if (error instanceof HttpException) {
			throw error;
		}

		throw new InternalServerErrorException(
			ErrorString({
				entity: model,
				type: EErrorStringAction.FETCHING_ERROR,
			}),
		);
	}
}

export function ApiFunctionGet<E extends BaseEntity>(options: { model: new () => E }) {
	return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
		descriptor.value = async function (
			this: {
				repository: Repository<E>;
			},
			id: string,
			properties?: TApiFunctionGetProperties<InstanceType<typeof options.model>>,
			relations?: FindOptionsRelations<E>,
		) {
			const filter: FindManyOptions<typeof options.model> = {
				relations: relations,
				where: { id },
			};

			if (properties) {
				const { ...entityProperties } = properties;

				const typedEntityProperties: keyof typeof options.model = entityProperties as Exclude<keyof Omit<E, "createdAt" | "receivedAt" | "updatedAt">, keyof E>;

				Object.keys(typedEntityProperties).forEach((key: string) => {
					if (typeof typedEntityProperties[key] === "string") {
						filter.where = {
							...filter.where,
							[key]: Like(`%${typedEntityProperties[key]}%`),
						};
					}
				});
			}

			const repository: Repository<E> = this.repository;

			if (!repository) {
				throw new Error("Repository is not available in this context");
			}

			return executor(repository, options.model, filter);
		};

		return descriptor;
	};
}
