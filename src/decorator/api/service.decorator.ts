import 'reflect-metadata';
import {BaseEntity, EntityTarget, FindOptionsRelations} from "typeorm";
import { IApiGetListResponseResult } from "../../interface";
import { EApiFunctionType } from "../../enum";
import { ApiFunction } from "./function";
import {TApiFunctionGetListProperties} from "../../type";
import {TApiFunctionGetProperties} from "../../type/api/function/get-properties.type";

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
			}
		};

		Reflect.defineMetadata(API_SERVICE_METADATA_KEY, {
			entity: options.entity,
			getListMetadata: {
				model: options.entity,
				type: EApiFunctionType.GET_LIST,
			}
		}, ExtendedClass);

		Object.setPrototypeOf(ExtendedClass, originalConstructor);

		return ExtendedClass as TFunction;
	}
}
