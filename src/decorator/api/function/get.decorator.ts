import { HttpException, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { Like } from "typeorm";

import { EErrorStringAction } from "../../../enum";

import { ErrorException, ErrorString } from "../../../utility";

import type { IApiBaseEntity } from "../../../interface";
import type { IApiFunctionGetExecutorProperties, TApiFunctionGetProperties } from "../../../type";

import type { FindManyOptions, FindOptionsRelations, Repository } from "typeorm";

async function executor<E extends IApiBaseEntity>(options: IApiFunctionGetExecutorProperties<E>): Promise<E> {
	const { entity, filter, repository }: IApiFunctionGetExecutorProperties<E> = options;

	try {
		const item: E | null = await repository.findOne(filter);

		if (!item) {
			throw new NotFoundException(ErrorString({ entity: entity, type: EErrorStringAction.NOT_FOUND }));
		}

		return item;
	} catch (error) {
		if (error instanceof HttpException) {
			throw error;
		}

		throw new InternalServerErrorException(
			ErrorString({
				entity: entity,
				type: EErrorStringAction.FETCHING_ERROR,
			}),
		);
	}
}

export function ApiFunctionGet<E extends IApiBaseEntity>(options: { model: new () => E }) {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	return function (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
		descriptor.value = async function (
			this: {
				repository: Repository<E>;
			},
			id: string,
			properties?: TApiFunctionGetProperties<InstanceType<typeof options.model>>,
			relations?: FindOptionsRelations<E>,
		): Promise<E> {
			const filter: FindManyOptions<typeof options.model> = {
				relations: relations,
				where: { id },
			};

			if (properties) {
				const { ...entityProperties }: TApiFunctionGetProperties<InstanceType<typeof options.model>> = properties;

				const typedEntityProperties: keyof typeof options.model = entityProperties as Exclude<keyof Omit<E, "createdAt" | "receivedAt" | "updatedAt">, keyof E>;

				for (const key of Object.keys(typedEntityProperties)) {
					if (typeof typedEntityProperties[key] === "string") {
						filter.where = {
							...filter.where,
							[key]: Like(`%${typedEntityProperties[key] as string}%`),
						};
					}
				}
			}

			const repository: Repository<E> = this.repository;

			if (!repository) {
				throw ErrorException("Repository is not available in this context");
			}

			return executor<E>({ entity: options.model, filter, repository });
		};

		return descriptor;
	};
}
