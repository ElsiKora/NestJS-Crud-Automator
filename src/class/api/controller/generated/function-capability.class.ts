import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiControllerGeneratedFunction } from "@type/class/api/controller/generated/function.type";
import type { TApiControllerGeneratedScopeFunctionType } from "@type/class/api/controller/generated/scope-function-type.type";

import { ErrorException } from "@utility/error/exception.utility";

/**
 * Tracks exact built-in decorated service function identities used by generated mandatory calls.
 */
export class ApiControllerGeneratedFunctionCapability {
	private static readonly REGISTRY: WeakMap<TApiControllerGeneratedFunction, { entity: new () => IApiBaseEntity; functionType: TApiControllerGeneratedScopeFunctionType }> = new WeakMap<TApiControllerGeneratedFunction, { entity: new () => IApiBaseEntity; functionType: TApiControllerGeneratedScopeFunctionType }>();

	public static mark(implementation: unknown, functionType: TApiControllerGeneratedScopeFunctionType, entity: new () => IApiBaseEntity): void {
		if (typeof implementation !== "function") {
			throw ErrorException(`Generated ${functionType} capability must mark a function`);
		}

		this.REGISTRY.set(implementation as TApiControllerGeneratedFunction, { entity, functionType });
	}

	public static markOwn(service: object, propertyKey: PropertyKey, functionType: TApiControllerGeneratedScopeFunctionType, entity: new () => IApiBaseEntity): void {
		const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(service, propertyKey);

		if (!descriptor || !("value" in descriptor) || typeof descriptor.value !== "function") {
			throw ErrorException(`Generated ${functionType} service capability must be an own data function`);
		}

		this.mark(descriptor.value, functionType, entity);
	}

	// eslint-disable-next-line @elsikora/typescript/no-unnecessary-type-parameters
	public static resolve<T extends TApiControllerGeneratedFunction>(service: object, propertyKey: PropertyKey, functionType: TApiControllerGeneratedScopeFunctionType, entity: unknown): T {
		if (typeof entity !== "function") {
			throw ErrorException(`Generated ${functionType} entity capability must be a constructor`);
		}

		const entityConstructor: new () => IApiBaseEntity = entity as new () => IApiBaseEntity;
		let current: null | object = service;

		while (current) {
			const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(current, propertyKey);

			if (descriptor) {
				if (!("value" in descriptor) || typeof descriptor.value !== "function") {
					throw ErrorException(`Generated ${functionType} service capability must be a data function`);
				}

				const implementation: TApiControllerGeneratedFunction = descriptor.value as TApiControllerGeneratedFunction;
				const capability: { entity: new () => IApiBaseEntity; functionType: TApiControllerGeneratedScopeFunctionType } | undefined = this.REGISTRY.get(implementation);

				if (capability?.entity !== entityConstructor || capability.functionType !== functionType) {
					throw ErrorException(`Generated ${functionType} service function is not protected by its built-in decorator`);
				}

				return implementation as T;
			}

			current = Object.getPrototypeOf(current) as null | object;
		}

		throw ErrorException(`Generated ${functionType} service function is not available`);
	}
}
