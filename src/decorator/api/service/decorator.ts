import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiGetListResponseResult } from "@interface/decorator/api";
import type { TApiFunctionCreateProperties, TApiFunctionDeleteCriteria, TApiFunctionGetListProperties, TApiFunctionGetManyProperties, TApiFunctionGetProperties, TApiFunctionUpdateCriteria, TApiFunctionUpdateProperties } from "@type/decorator/api/function";
import type { TApiServiceProperties } from "@type/decorator/api/service";

import { ApiServiceBase } from "@class/api/service-base.class";
import { ApiFunction } from "@decorator/api/function";
import { EApiFunctionType } from "@enum/decorator/api";

/**
 * Creates a class decorator that adds CRUD operations to a service class for a specific entity
 * @param {TApiServiceProperties<E>} properties - Configuration properties for the service
 * @returns {ClassDecorator} A class decorator function that extends the target class with CRUD methods
 * @template E - The entity type
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/api-reference/decorators/api-service/api-service | API Reference - ApiService}
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/core-concepts/services | Core Concepts - Services}
 */
export function ApiService<E extends IApiBaseEntity>(properties: TApiServiceProperties<E>) {
	const { entity, functions }: TApiServiceProperties<E> = properties;

	// eslint-disable-next-line @elsikora/typescript/no-explicit-any
	return function <TFunction extends new (...arguments_: Array<any>) => object>(target: TFunction): TFunction {
		const originalConstructor: TFunction = target;

		// eslint-disable-next-line @elsikora/typescript/no-explicit-any
		const ExtendedClass: { new (...arguments_: Array<any>): object; prototype: object } = class extends originalConstructor {
			// eslint-disable-next-line @elsikora/typescript/no-explicit-any
			constructor(..._arguments: Array<any>) {
				// eslint-disable-next-line @elsikora/typescript/no-unsafe-argument
				super(..._arguments);

				if (ApiServiceShouldDefineFunction(this, originalConstructor.prototype, EApiFunctionType.GET_LIST)) {
					Object.defineProperty(this, EApiFunctionType.GET_LIST, {
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						configurable: true,
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						enumerable: true,
						value: async function (properties: TApiFunctionGetListProperties<E>): Promise<IApiGetListResponseResult<E>> {
							const apiFunctionDecorator: (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor = ApiFunction({
								entity,
								transaction: functions?.[EApiFunctionType.GET_LIST]?.transaction,
								type: EApiFunctionType.GET_LIST,
							});

							const descriptor: {
								// eslint-disable-next-line @elsikora/typescript/naming-convention
								configurable: boolean;
								// eslint-disable-next-line @elsikora/typescript/naming-convention
								enumerable: boolean;
								value: () => void;
								// eslint-disable-next-line @elsikora/typescript/naming-convention
								writable: boolean;
							} = {
								// eslint-disable-next-line @elsikora/typescript/naming-convention
								configurable: true,
								// eslint-disable-next-line @elsikora/typescript/naming-convention
								enumerable: true,
								// eslint-disable-next-line @elsikora/sonar/no-nested-functions
								value: () => void 0,
								// eslint-disable-next-line @elsikora/typescript/naming-convention
								writable: true,
							};

							const decoratedDescriptor: PropertyDescriptor = apiFunctionDecorator(this, EApiFunctionType.GET_LIST, descriptor);

							return (decoratedDescriptor.value as (this: unknown, properties: TApiFunctionGetListProperties<E>) => Promise<IApiGetListResponseResult<E>>).call(this, properties);
						},
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						writable: true,
					});
				}

				if (ApiServiceShouldDefineFunction(this, originalConstructor.prototype, EApiFunctionType.GET)) {
					Object.defineProperty(this, EApiFunctionType.GET, {
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						configurable: true,
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						enumerable: true,
						value: async function (properties: TApiFunctionGetProperties<E>): Promise<E> {
							const apiFunctionDecorator: (_target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor = ApiFunction({
								entity,
								transaction: functions?.[EApiFunctionType.GET]?.transaction,
								type: EApiFunctionType.GET,
							});

							const descriptor: {
								// eslint-disable-next-line @elsikora/typescript/naming-convention
								configurable: boolean;
								// eslint-disable-next-line @elsikora/typescript/naming-convention
								enumerable: boolean;
								value: () => void;
								// eslint-disable-next-line @elsikora/typescript/naming-convention
								writable: boolean;
							} = {
								// eslint-disable-next-line @elsikora/typescript/naming-convention
								configurable: true,
								// eslint-disable-next-line @elsikora/typescript/naming-convention
								enumerable: true,
								// eslint-disable-next-line @elsikora/sonar/no-nested-functions
								value: () => void 0,
								// eslint-disable-next-line @elsikora/typescript/naming-convention
								writable: true,
							};

							const decoratedDescriptor: PropertyDescriptor = apiFunctionDecorator(this, EApiFunctionType.GET, descriptor);

							return (decoratedDescriptor.value as (this: unknown, properties: TApiFunctionGetProperties<E>) => Promise<E>).call(this, properties);
						},
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						writable: true,
					});
				}

				if (ApiServiceShouldDefineFunction(this, originalConstructor.prototype, EApiFunctionType.GET_MANY)) {
					Object.defineProperty(this, EApiFunctionType.GET_MANY, {
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						configurable: true,
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						enumerable: true,
						value: async function (properties: TApiFunctionGetManyProperties<E>): Promise<Array<E>> {
							const apiFunctionDecorator: (_target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor = ApiFunction({
								entity,
								transaction: functions?.[EApiFunctionType.GET_MANY]?.transaction,
								type: EApiFunctionType.GET_MANY,
							});

							const descriptor: {
								// eslint-disable-next-line @elsikora/typescript/naming-convention
								configurable: boolean;
								// eslint-disable-next-line @elsikora/typescript/naming-convention
								enumerable: boolean;
								value: () => void;
								// eslint-disable-next-line @elsikora/typescript/naming-convention
								writable: boolean;
							} = {
								// eslint-disable-next-line @elsikora/typescript/naming-convention
								configurable: true,
								// eslint-disable-next-line @elsikora/typescript/naming-convention
								enumerable: true,
								// eslint-disable-next-line @elsikora/sonar/no-nested-functions
								value: () => void 0,
								// eslint-disable-next-line @elsikora/typescript/naming-convention
								writable: true,
							};

							const decoratedDescriptor: PropertyDescriptor = apiFunctionDecorator(this, EApiFunctionType.GET_MANY, descriptor);

							return (decoratedDescriptor.value as (this: unknown, properties: TApiFunctionGetManyProperties<E>) => Promise<Array<E>>).call(this, properties);
						},
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						writable: true,
					});
				}

				if (ApiServiceShouldDefineFunction(this, originalConstructor.prototype, EApiFunctionType.CREATE)) {
					Object.defineProperty(this, EApiFunctionType.CREATE, {
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						configurable: true,
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						enumerable: true,
						value: async function (properties: TApiFunctionCreateProperties<E>): Promise<E> {
							const apiFunctionDecorator: (_target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor = ApiFunction({
								entity,
								transaction: functions?.[EApiFunctionType.CREATE]?.transaction,
								type: EApiFunctionType.CREATE,
							});

							const descriptor: {
								// eslint-disable-next-line @elsikora/typescript/naming-convention
								configurable: boolean;
								// eslint-disable-next-line @elsikora/typescript/naming-convention
								enumerable: boolean;
								value: () => void;
								// eslint-disable-next-line @elsikora/typescript/naming-convention
								writable: boolean;
							} = {
								// eslint-disable-next-line @elsikora/typescript/naming-convention
								configurable: true,
								// eslint-disable-next-line @elsikora/typescript/naming-convention
								enumerable: true,
								// eslint-disable-next-line @elsikora/sonar/no-nested-functions
								value: () => void 0,
								// eslint-disable-next-line @elsikora/typescript/naming-convention
								writable: true,
							};

							const decoratedDescriptor: PropertyDescriptor = apiFunctionDecorator(this, EApiFunctionType.CREATE, descriptor);

							return (decoratedDescriptor.value as (this: unknown, properties: TApiFunctionCreateProperties<E>) => Promise<E>).call(this, properties);
						},
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						writable: true,
					});
				}

				if (ApiServiceShouldDefineFunction(this, originalConstructor.prototype, EApiFunctionType.UPDATE)) {
					Object.defineProperty(this, EApiFunctionType.UPDATE, {
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						configurable: true,
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						enumerable: true,
						value: async function (criteria: TApiFunctionUpdateCriteria<E>, properties: TApiFunctionUpdateProperties<E>): Promise<E> {
							const apiFunctionDecorator: (_target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor = ApiFunction({
								entity,
								transaction: functions?.[EApiFunctionType.UPDATE]?.transaction,
								type: EApiFunctionType.UPDATE,
							});

							const descriptor: {
								// eslint-disable-next-line @elsikora/typescript/naming-convention
								configurable: boolean;
								// eslint-disable-next-line @elsikora/typescript/naming-convention
								enumerable: boolean;
								value: () => void;
								// eslint-disable-next-line @elsikora/typescript/naming-convention
								writable: boolean;
							} = {
								// eslint-disable-next-line @elsikora/typescript/naming-convention
								configurable: true,
								// eslint-disable-next-line @elsikora/typescript/naming-convention
								enumerable: true,
								// eslint-disable-next-line @elsikora/sonar/no-nested-functions
								value: () => void 0,
								// eslint-disable-next-line @elsikora/typescript/naming-convention
								writable: true,
							};

							const decoratedDescriptor: PropertyDescriptor = apiFunctionDecorator(this, EApiFunctionType.UPDATE, descriptor);

							return (decoratedDescriptor.value as (this: unknown, criteria: TApiFunctionUpdateCriteria<E>, properties: TApiFunctionUpdateProperties<E>) => Promise<E>).call(this, criteria, properties);
						},
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						writable: true,
					});
				}

				if (ApiServiceShouldDefineFunction(this, originalConstructor.prototype, EApiFunctionType.DELETE)) {
					Object.defineProperty(this, EApiFunctionType.DELETE, {
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						configurable: true,
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						enumerable: true,
						value: async function (criteria: TApiFunctionDeleteCriteria<E>): Promise<void> {
							const apiFunctionDecorator: (_target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor = ApiFunction({
								entity,
								transaction: functions?.[EApiFunctionType.DELETE]?.transaction,
								type: EApiFunctionType.DELETE,
							});

							const descriptor: {
								// eslint-disable-next-line @elsikora/typescript/naming-convention
								configurable: boolean;
								// eslint-disable-next-line @elsikora/typescript/naming-convention
								enumerable: boolean;
								value: () => void;
								// eslint-disable-next-line @elsikora/typescript/naming-convention
								writable: boolean;
							} = {
								// eslint-disable-next-line @elsikora/typescript/naming-convention
								configurable: true,
								// eslint-disable-next-line @elsikora/typescript/naming-convention
								enumerable: true,
								// eslint-disable-next-line @elsikora/sonar/no-nested-functions
								value: () => void 0,
								// eslint-disable-next-line @elsikora/typescript/naming-convention
								writable: true,
							};

							const decoratedDescriptor: PropertyDescriptor = apiFunctionDecorator(this, EApiFunctionType.DELETE, descriptor);

							await (decoratedDescriptor.value as (this: unknown, criteria: TApiFunctionDeleteCriteria<E>) => Promise<unknown>).call(this, criteria);
						},
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						writable: true,
					});
				}
			}
		};

		Object.setPrototypeOf(ExtendedClass, originalConstructor);

		return ExtendedClass as TFunction;
	};
}

/**
 * Checks whether ApiService should define a generated function on the instance.
 * @param {unknown} instance - Service instance after constructor field initializers ran.
 * @param {unknown} prototype - Original service prototype.
 * @param {EApiFunctionType} functionName - Generated function name.
 * @returns {boolean} True when no direct implementation exists.
 */
function ApiServiceShouldDefineFunction(instance: unknown, prototype: unknown, functionName: EApiFunctionType): boolean {
	if (Object.prototype.hasOwnProperty.call(instance, functionName)) {
		return false;
	}

	let currentPrototype: null | object = typeof prototype === "object" && prototype !== null ? prototype : null;

	while (currentPrototype && currentPrototype !== Object.prototype) {
		if (Object.prototype.hasOwnProperty.call(currentPrototype, functionName)) {
			return currentPrototype === ApiServiceBase.prototype;
		}

		currentPrototype = Object.getPrototypeOf(currentPrototype) as null | object;
	}

	return true;
}
