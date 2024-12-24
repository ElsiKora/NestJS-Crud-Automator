import type { FindOptionsRelations } from "typeorm";

import type { IApiBaseEntity, IApiGetListResponseResult } from "../../interface";
import type { TApiFunctionCreateProperties, TApiFunctionDeleteCriteria, TApiFunctionGetListProperties, TApiFunctionGetManyProperties, TApiFunctionGetProperties, TApiFunctionUpdateCriteria, TApiFunctionUpdateProperties, TApiServiceProperties } from "../../type";

import { EApiFunctionType } from "../../enum";

import { ApiFunction } from "./function";

export function ApiService<E extends IApiBaseEntity>(properties: TApiServiceProperties<E>) {
	const { entity }: TApiServiceProperties<E> = properties;

	return function <TFunction extends new (...arguments_: Array<any>) => {}>(target: TFunction): TFunction {
		const originalConstructor: TFunction = target;

		const ExtendedClass: { new (...arguments_: Array<any>): {}; prototype: {} } = class extends originalConstructor {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			constructor(..._arguments: Array<any>) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				super(..._arguments);

				if (!this.hasOwnProperty(EApiFunctionType.GET_LIST)) {
					Object.defineProperty(this, EApiFunctionType.GET_LIST, {
						configurable: true,
						enumerable: true,
						value: async function (properties: TApiFunctionGetListProperties<E>, relations: FindOptionsRelations<E>): Promise<IApiGetListResponseResult<E>> {
							const apiFunctionDecorator: (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor = ApiFunction({
								entity,
								relations,
								type: EApiFunctionType.GET_LIST,
							});

							const descriptor: {
								configurable: boolean;
								enumerable: boolean;
								value: () => void;
								writable: boolean;
							} = {
								configurable: true,
								enumerable: true,
								value: () => void 0,
								writable: true,
							};

							const decoratedDescriptor: PropertyDescriptor = apiFunctionDecorator(this, EApiFunctionType.GET_LIST, descriptor);

							return (decoratedDescriptor.value as (this: any, properties: TApiFunctionGetListProperties<E>) => Promise<IApiGetListResponseResult<E>>).call(this, properties);
						},
						writable: true,
					});
				}

				if (!this.hasOwnProperty(EApiFunctionType.GET)) {
					Object.defineProperty(this, EApiFunctionType.GET, {
						configurable: true,
						enumerable: true,
						value: async function (properties: TApiFunctionGetProperties<E>): Promise<E> {
							const apiFunctionDecorator: (_target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor = ApiFunction({
								entity,
								type: EApiFunctionType.GET,
							});

							const descriptor: {
								configurable: boolean;
								enumerable: boolean;
								value: () => void;
								writable: boolean;
							} = {
								configurable: true,
								enumerable: true,
								value: () => void 0,
								writable: true,
							};

							const decoratedDescriptor: PropertyDescriptor = apiFunctionDecorator(this, EApiFunctionType.GET, descriptor);

							return (decoratedDescriptor.value as (this: any, properties: TApiFunctionGetProperties<E>) => Promise<E>).call(this, properties);
						},
						writable: true,
					});
				}

				if (!this.hasOwnProperty(EApiFunctionType.GET_MANY)) {
					Object.defineProperty(this, EApiFunctionType.GET_MANY, {
						configurable: true,
						enumerable: true,
						value: async function (properties: TApiFunctionGetManyProperties<E>): Promise<E> {
							const apiFunctionDecorator: (_target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor = ApiFunction({
								entity,
								type: EApiFunctionType.GET_MANY,
							});

							const descriptor: {
								configurable: boolean;
								enumerable: boolean;
								value: () => void;
								writable: boolean;
							} = {
								configurable: true,
								enumerable: true,
								value: () => void 0,
								writable: true,
							};

							const decoratedDescriptor: PropertyDescriptor = apiFunctionDecorator(this, EApiFunctionType.GET_MANY, descriptor);

							return (decoratedDescriptor.value as (this: any, properties: TApiFunctionGetManyProperties<E>) => Promise<E>).call(this, properties);
						},
						writable: true,
					});
				}

				if (!this.hasOwnProperty(EApiFunctionType.CREATE)) {
					Object.defineProperty(this, EApiFunctionType.CREATE, {
						configurable: true,
						enumerable: true,
						value: async function (properties: TApiFunctionCreateProperties<E>): Promise<E> {
							const apiFunctionDecorator: (_target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor = ApiFunction({
								entity,
								type: EApiFunctionType.CREATE,
							});

							const descriptor: {
								configurable: boolean;
								enumerable: boolean;
								value: () => void;
								writable: boolean;
							} = {
								configurable: true,
								enumerable: true,
								value: () => void 0,
								writable: true,
							};

							const decoratedDescriptor: PropertyDescriptor = apiFunctionDecorator(this, EApiFunctionType.CREATE, descriptor);

							return (decoratedDescriptor.value as (this: any, properties: TApiFunctionCreateProperties<E>) => Promise<E>).call(this, properties);
						},
						writable: true,
					});
				}

				if (!this.hasOwnProperty(EApiFunctionType.UPDATE)) {
					Object.defineProperty(this, EApiFunctionType.UPDATE, {
						configurable: true,
						enumerable: true,
						value: async function (criteria: TApiFunctionUpdateCriteria<E>, properties: TApiFunctionUpdateProperties<E>): Promise<E> {
							const apiFunctionDecorator: (_target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor = ApiFunction({
								entity,
								type: EApiFunctionType.UPDATE,
							});

							const descriptor: {
								configurable: boolean;
								enumerable: boolean;
								value: () => void;
								writable: boolean;
							} = {
								configurable: true,
								enumerable: true,
								value: () => void 0,
								writable: true,
							};

							const decoratedDescriptor: PropertyDescriptor = apiFunctionDecorator(this, EApiFunctionType.UPDATE, descriptor);

							return (decoratedDescriptor.value as (this: any, criteria: TApiFunctionUpdateCriteria<E>, properties: TApiFunctionUpdateProperties<E>) => Promise<E>).call(this, criteria, properties);
						},
						writable: true,
					});
				}

				if (!this.hasOwnProperty(EApiFunctionType.DELETE)) {
					Object.defineProperty(this, EApiFunctionType.DELETE, {
						configurable: true,
						enumerable: true,
						value: async function (criteria: TApiFunctionDeleteCriteria<E>): Promise<void> {
							const apiFunctionDecorator: (_target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor = ApiFunction({
								entity,
								type: EApiFunctionType.DELETE,
							});

							const descriptor: {
								configurable: boolean;
								enumerable: boolean;
								value: () => void;
								writable: boolean;
							} = {
								configurable: true,
								enumerable: true,
								value: () => void 0,
								writable: true,
							};

							const decoratedDescriptor: PropertyDescriptor = apiFunctionDecorator(this, EApiFunctionType.DELETE, descriptor);

							return (decoratedDescriptor.value as (this: any, criteria: TApiFunctionDeleteCriteria<E>) => Promise<void>).call(this, criteria);
						},
						writable: true,
					});
				}
			}
		};

		Object.setPrototypeOf(ExtendedClass, originalConstructor);

		return ExtendedClass as TFunction;
	};
}
