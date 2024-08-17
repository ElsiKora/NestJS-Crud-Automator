import "reflect-metadata";

import { EApiFunctionType } from "../../enum";

import { ApiFunction } from "./function";

import type { IApiGetListResponseResult } from "../../interface";

import type { TApiFunctionCreateProperties, TApiFunctionGetListProperties, TApiFunctionGetProperties, TApiFunctionUpdateProperties } from "../../type";
import type { BaseEntity, EntityTarget, FindOptionsRelations } from "typeorm";

const API_SERVICE_METADATA_KEY = Symbol("ApiServiceMetadata");

export function ApiService<E extends BaseEntity>(options: { entity: EntityTarget<E>; relations?: FindOptionsRelations<E> }) {
	return function <TFunction extends new (...arguments_: Array<any>) => {}>(target: TFunction) {
		const originalConstructor = target;

		const ExtendedClass = class extends originalConstructor {
			constructor(...arguments_: Array<any>) {
				super(...arguments_);

				if (!this.hasOwnProperty(EApiFunctionType.GET_LIST)) {
					Object.defineProperty(this, EApiFunctionType.GET_LIST, {
						configurable: true,
						enumerable: true,
						value: async function (properties: TApiFunctionGetListProperties<E>): Promise<IApiGetListResponseResult<E>> {
							const apiFunctionDecorator = ApiFunction({
								model: options.entity as new () => BaseEntity,
								relations: options.relations,
								type: EApiFunctionType.GET_LIST,
							});

							const descriptor = {
								configurable: true,
								enumerable: true,
								value: function () {},
								writable: true,
							};

							const decoratedDescriptor: PropertyDescriptor = apiFunctionDecorator(this, EApiFunctionType.GET_LIST, descriptor);

							return Reflect.apply(decoratedDescriptor.value, this, [properties]);
						},
						writable: true,
					});
				}

				if (!this.hasOwnProperty(EApiFunctionType.GET)) {
					Object.defineProperty(this, EApiFunctionType.GET, {
						configurable: true,
						enumerable: true,
						value: async function (id: string, properties: TApiFunctionGetProperties<E>): Promise<E> {
							const apiFunctionDecorator = ApiFunction({
								model: options.entity as new () => BaseEntity,
								relations: options.relations,
								type: EApiFunctionType.GET,
							});

							const descriptor = {
								configurable: true,
								enumerable: true,
								value: function () {},
								writable: true,
							};

							const decoratedDescriptor: PropertyDescriptor = apiFunctionDecorator(this, EApiFunctionType.GET, descriptor);

							return Reflect.apply(decoratedDescriptor.value, this, [id, properties]);
						},
						writable: true,
					});
				}

				if (!this.hasOwnProperty(EApiFunctionType.CREATE)) {
					Object.defineProperty(this, EApiFunctionType.CREATE, {
						configurable: true,
						enumerable: true,
						value: async function (properties: TApiFunctionCreateProperties<E>): Promise<E> {
							const apiFunctionDecorator = ApiFunction({
								model: options.entity as new () => BaseEntity,
								relations: options.relations,
								type: EApiFunctionType.CREATE,
							});

							const descriptor = {
								configurable: true,
								enumerable: true,
								value: function () {},
								writable: true,
							};

							const decoratedDescriptor: PropertyDescriptor = apiFunctionDecorator(this, EApiFunctionType.CREATE, descriptor);

							return Reflect.apply(decoratedDescriptor.value, this, [properties]);
						},
						writable: true,
					});
				}

				if (!this.hasOwnProperty(EApiFunctionType.UPDATE)) {
					Object.defineProperty(this, EApiFunctionType.UPDATE, {
						configurable: true,
						enumerable: true,
						value: async function (id: string, properties: TApiFunctionUpdateProperties<E>): Promise<E> {
							const apiFunctionDecorator = ApiFunction({
								model: options.entity as new () => BaseEntity,
								relations: options.relations,
								type: EApiFunctionType.UPDATE,
							});

							const descriptor = {
								configurable: true,
								enumerable: true,
								value: function () {},
								writable: true,
							};

							const decoratedDescriptor: PropertyDescriptor = apiFunctionDecorator(this, EApiFunctionType.UPDATE, descriptor);

							return Reflect.apply(decoratedDescriptor.value, this, [id, properties]);
						},
						writable: true,
					});
				}

				if (!this.hasOwnProperty(EApiFunctionType.DELETE)) {
					Object.defineProperty(this, EApiFunctionType.DELETE, {
						configurable: true,
						enumerable: true,
						value: async function (id: string): Promise<void> {
							const apiFunctionDecorator = ApiFunction({
								model: options.entity as new () => BaseEntity,
								type: EApiFunctionType.DELETE,
							});

							const descriptor = {
								configurable: true,
								enumerable: true,
								value: function () {},
								writable: true,
							};

							const decoratedDescriptor: PropertyDescriptor = apiFunctionDecorator(this, EApiFunctionType.DELETE, descriptor);

							return Reflect.apply(decoratedDescriptor.value, this, [id]);
						},
						writable: true,
					});
				}
			}
		};

		Reflect.defineMetadata(
			API_SERVICE_METADATA_KEY,
			{
				createMetadata: {
					model: options.entity,
					type: EApiFunctionType.CREATE,
				},
				deleteMetadata: {
					model: options.entity,
					type: EApiFunctionType.DELETE,
				},
				entity: options.entity,
				getListMetadata: {
					model: options.entity,
					type: EApiFunctionType.GET_LIST,
				},
				getMetadata: {
					model: options.entity,
					type: EApiFunctionType.GET,
				},
				updateMetadata: {
					model: options.entity,
					type: EApiFunctionType.UPDATE,
				},
			},
			ExtendedClass,
		);

		Object.setPrototypeOf(ExtendedClass, originalConstructor);

		return ExtendedClass as TFunction;
	};
}
