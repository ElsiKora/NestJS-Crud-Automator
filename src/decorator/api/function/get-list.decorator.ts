import { HttpException, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { Between, LessThanOrEqual, Like, MoreThanOrEqual } from "typeorm";

import { API_FUNCTION_DECORATOR_CONSTANT } from "../../../constant";
import { EErrorStringAction } from "../../../enum";

import { ErrorString } from "../../../utility";

import type { IApiGetListResponseResult } from "../../../interface";
import type { TApiFunctionGetListProperties } from "../../../type";
import type { BaseEntity, FindManyOptions, FindOptionsRelations, Repository } from "typeorm";

async function executor<E extends BaseEntity>(repository: Repository<E>, entityType: new () => E, properties: TApiFunctionGetListProperties<E>, filter: FindManyOptions<E>): Promise<IApiGetListResponseResult<E>> {
	try {
		const [items, totalCount] = await repository.findAndCount(filter);

		if (items.length === 0) {
			throw new NotFoundException(
				ErrorString({
					entity: entityType,
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
				entity: entityType,
				type: EErrorStringAction.FETCHING_LIST_ERROR,
			}),
		);
	}
}

export function ApiFunctionGetList<E extends BaseEntity>(options: { model: new () => E }) {
	return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
		descriptor.value = async function (
			this: {
				repository: Repository<E>;
			},
			properties: TApiFunctionGetListProperties<InstanceType<typeof options.model>>,
			relations: FindOptionsRelations<E>,
		) {
			const { createdAtFrom, createdAtTo, limit, orderBy, orderDirection, page, receivedAtFrom, receivedAtTo, updatedAtFrom, updatedAtTo, ...entityProperties } = properties;

			const filter: FindManyOptions<typeof options.model> = {
				relations,
				skip: limit * (page - 1),
				take: limit,
				where: {},
			};

			const typedEntityProperties: keyof typeof options.model = entityProperties as Exclude<keyof Omit<E, "createdAt" | "receivedAt" | "updatedAt">, keyof E>;

			Object.keys(typedEntityProperties).forEach((key: string) => {
				if (typeof typedEntityProperties[key] === "string") {
					filter.where = {
						...filter.where,
						[key]: Like(`%${typedEntityProperties[key]}%`),
					};
				}
			});

			if (orderBy) {
				filter.order = {
					[orderBy as never as string]: orderDirection || API_FUNCTION_DECORATOR_CONSTANT.DEFAULT_FILTER_ORDER_BY_DIRECTION,
				};
			}

			if ("createdAt" in options.model.prototype) {
				if (createdAtFrom && createdAtTo) {
					filter.where = {
						...filter.where,
						createdAt: Between(createdAtFrom, createdAtTo),
					};
				} else if (createdAtFrom) {
					filter.where = {
						...filter.where,
						createdAt: MoreThanOrEqual(createdAtFrom),
					};
				} else if (createdAtTo) {
					filter.where = {
						...filter.where,
						createdAt: LessThanOrEqual(createdAtTo),
					};
				}
			}

			if ("updatedAt" in options.model.prototype) {
				if (updatedAtFrom && updatedAtTo) {
					filter.where = {
						...filter.where,
						updatedAt: Between(updatedAtFrom, updatedAtTo),
					};
				} else if (updatedAtFrom) {
					filter.where = {
						...filter.where,
						updatedAt: MoreThanOrEqual(updatedAtFrom),
					};
				} else if (updatedAtTo) {
					filter.where = {
						...filter.where,
						updatedAt: LessThanOrEqual(updatedAtTo),
					};
				}
			}

			if ("receivedAt" in options.model.prototype) {
				if (receivedAtFrom && receivedAtTo) {
					filter.where = {
						...filter.where,
						receivedAt: Between(receivedAtFrom, receivedAtTo),
					};
				} else if (receivedAtFrom) {
					filter.where = {
						...filter.where,
						receivedAt: MoreThanOrEqual(receivedAtFrom),
					};
				} else if (receivedAtTo) {
					filter.where = {
						...filter.where,
						receivedAt: LessThanOrEqual(receivedAtTo),
					};
				}
			}

			const repository: Repository<E> = this.repository;

			if (!repository) {
				throw new Error("Repository is not available in this context");
			}

			return executor(repository, options.model, properties, filter);
		};

		return descriptor;
	};
}
