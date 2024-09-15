import { EApiFunctionType } from "../../enum";

import { ApiFunction } from "./function";

import type { IApiBaseEntity, IApiGetListResponseResult } from "../../interface";

import type { TApiFunctionCreateProperties, TApiFunctionGetListProperties, TApiFunctionGetProperties, TApiFunctionUpdateProperties } from "../../type";
import type { TApiServiceProperties } from "../../type/decorator/api/service-properties.type";

import type { FindOptionsRelations } from "typeorm";

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
						value: async function (id: string, properties: TApiFunctionGetProperties<E>, relations: FindOptionsRelations<E>): Promise<E> {
							const apiFunctionDecorator: (_target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor = ApiFunction({
								entity,
								relations,
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

							return (decoratedDescriptor.value as (this: any, id: string, properties: TApiFunctionGetProperties<E>) => Promise<E>).call(this, id, properties);
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
						value: async function (id: string, properties: TApiFunctionUpdateProperties<E>): Promise<E> {
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

							return (decoratedDescriptor.value as (this: any, id: string, properties: TApiFunctionUpdateProperties<E>) => Promise<E>).call(this, id, properties);
						},
						writable: true,
					});
				}

				if (!this.hasOwnProperty(EApiFunctionType.DELETE)) {
					Object.defineProperty(this, EApiFunctionType.DELETE, {
						configurable: true,
						enumerable: true,
						value: async function (id: string): Promise<void> {
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

							return (decoratedDescriptor.value as (this: any, id: string) => Promise<void>).call(this, id);
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
