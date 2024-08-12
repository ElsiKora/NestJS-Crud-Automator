import 'reflect-metadata';
import {BaseEntity, EntityTarget, FindOptionsRelations} from "typeorm";
import { IApiGetListResponseResult } from "../../interface";
import { EApiFunctionType } from "../../enum";
import { ApiFunction } from "./function";
import {TApiFunctionCreateProperties, TApiFunctionGetListProperties} from "../../type";
import {TApiFunctionGetProperties} from "../../type/api/function/get-properties.type";
import {TApiFunctionUpdateProperties} from "../../type/api/function/update-properties.type";

const API_SERVICE_METADATA_KEY = Symbol('ApiServiceMetadata');

export function ApiService<E extends BaseEntity>(options: { entity: EntityTarget<E>, relations?: FindOptionsRelations<E> }) {
	return function <TFunction extends { new (...args: any[]): {} }>(target: TFunction) {
		const originalConstructor = target;

		const ExtendedClass = class extends originalConstructor {
			constructor(...args: any[]) {
				super(...args);

				if (!this.hasOwnProperty(EApiFunctionType.GET_LIST)) {
					Object.defineProperty(this, EApiFunctionType.GET_LIST, {
						value: async function(properties: TApiFunctionGetListProperties<E>): Promise<IApiGetListResponseResult<E>> {

							const apiFunctionDecorator = ApiFunction({
								model: options.entity as new () => BaseEntity,
								type: EApiFunctionType.GET_LIST,
								relations: options.relations
							});

							const descriptor = {
								value: function() {},
								writable: true,
								enumerable: true,
								configurable: true
							};

							const decoratedDescriptor:PropertyDescriptor = apiFunctionDecorator(this, EApiFunctionType.GET_LIST, descriptor);

							return decoratedDescriptor.value.apply(this, [properties]);
						},
						writable: true,
						enumerable: true,
						configurable: true
					});
				}

				if (!this.hasOwnProperty(EApiFunctionType.GET)) {
					Object.defineProperty(this, EApiFunctionType.GET, {
						value: async function(id: string, properties: TApiFunctionGetProperties<E>): Promise<E> {

							const apiFunctionDecorator = ApiFunction({
								model: options.entity as new () => BaseEntity,
								type: EApiFunctionType.GET,
								relations: options.relations
							});

							const descriptor = {
								value: function() {},
								writable: true,
								enumerable: true,
								configurable: true
							};

							const decoratedDescriptor:PropertyDescriptor = apiFunctionDecorator(this, EApiFunctionType.GET, descriptor);

							return decoratedDescriptor.value.apply(this, [id, properties]);
						},
						writable: true,
						enumerable: true,
						configurable: true
					});
				}

				if (!this.hasOwnProperty(EApiFunctionType.CREATE)) {
					Object.defineProperty(this, EApiFunctionType.CREATE, {
						value: async function (properties: TApiFunctionCreateProperties<E>): Promise<E> {
							const apiFunctionDecorator = ApiFunction({
								model: options.entity as new () => BaseEntity,
								type: EApiFunctionType.CREATE,
								relations: options.relations,
							});

							const descriptor = {
								value: function () {},
								writable: true,
								enumerable: true,
								configurable: true,
							};

							const decoratedDescriptor: PropertyDescriptor = apiFunctionDecorator(
								this,
								EApiFunctionType.CREATE,
								descriptor
							);

							return decoratedDescriptor.value.apply(this, [properties]);
						},
						writable: true,
						enumerable: true,
						configurable: true,
					});
				}

				if (!this.hasOwnProperty(EApiFunctionType.UPDATE)) {
					Object.defineProperty(this, EApiFunctionType.UPDATE, {
						value: async function (
							id: string,
							properties: TApiFunctionUpdateProperties<E>
						): Promise<E> {
							const apiFunctionDecorator = ApiFunction({
								model: options.entity as new () => BaseEntity,
								type: EApiFunctionType.UPDATE,
								relations: options.relations,
							});

							const descriptor = {
								value: function () {},
								writable: true,
								enumerable: true,
								configurable: true,
							};

							const decoratedDescriptor: PropertyDescriptor = apiFunctionDecorator(
								this,
								EApiFunctionType.UPDATE,
								descriptor
							);

							return decoratedDescriptor.value.apply(this, [id, properties]);
						},
						writable: true,
						enumerable: true,
						configurable: true,
					});
				}

				if (!this.hasOwnProperty(EApiFunctionType.DELETE)) {
					Object.defineProperty(this, EApiFunctionType.DELETE, {
						value: async function (id: string): Promise<void> {
							const apiFunctionDecorator = ApiFunction({
								model: options.entity as new () => BaseEntity,
								type: EApiFunctionType.DELETE,
							});

							const descriptor = {
								value: function () {},
								writable: true,
								enumerable: true,
								configurable: true,
							};

							const decoratedDescriptor: PropertyDescriptor = apiFunctionDecorator(
								this,
								EApiFunctionType.DELETE,
								descriptor
							);

							return decoratedDescriptor.value.apply(this, [id]);
						},
						writable: true,
						enumerable: true,
						configurable: true,
					});
				}
			}
		};

		Reflect.defineMetadata(API_SERVICE_METADATA_KEY, {
			entity: options.entity,
			getListMetadata: {
				model: options.entity,
				type: EApiFunctionType.GET_LIST,
			},
			getMetadata: {
				model: options.entity,
				type: EApiFunctionType.GET,
			},
			createMetadata: {
				model: options.entity,
				type: EApiFunctionType.CREATE,
			},
			updateMetadata: {
				model: options.entity,
				type: EApiFunctionType.UPDATE,
			},
			deleteMetadata: {
				model: options.entity,
				type: EApiFunctionType.DELETE,
			},
		}, ExtendedClass);

		Object.setPrototypeOf(ExtendedClass, originalConstructor);

		return ExtendedClass as TFunction;
	}
}
