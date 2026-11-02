import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiControllerGeneratedFunction } from "@type/class/api/controller/generated/function.type";
import type { TApiControllerGeneratedScopeFunctionType } from "@type/class/api/controller/generated/scope-function-type.type";

import { EApiFunctionTransactionMode } from "@enum/decorator/api";
import { ErrorException } from "@utility/error/exception.utility";
import { ObjectFindPropertyDescriptor } from "@utility/object-find-property-descriptor.utility";

/**
 * Tracks exact built-in decorated service function identities used by generated mandatory calls, with the transaction mode each one runs in.
 */
export class ApiControllerGeneratedFunctionCapability {
	private static readonly REGISTRY: WeakMap<TApiControllerGeneratedFunction, { entity: new () => IApiBaseEntity; functionType: TApiControllerGeneratedScopeFunctionType; transactionMode: EApiFunctionTransactionMode }> = new WeakMap<TApiControllerGeneratedFunction, { entity: new () => IApiBaseEntity; functionType: TApiControllerGeneratedScopeFunctionType; transactionMode: EApiFunctionTransactionMode }>();

	public static mark(implementation: unknown, functionType: TApiControllerGeneratedScopeFunctionType, entity: new () => IApiBaseEntity, transactionMode: EApiFunctionTransactionMode = EApiFunctionTransactionMode.SUPPORTS): void {
		if (typeof implementation !== "function") {
			throw ErrorException(`Generated ${functionType} capability must mark a function`);
		}

		this.REGISTRY.set(implementation as TApiControllerGeneratedFunction, { entity, functionType, transactionMode });
	}

	public static markOwn(service: object, propertyKey: PropertyKey, functionType: TApiControllerGeneratedScopeFunctionType, entity: new () => IApiBaseEntity, transactionMode: EApiFunctionTransactionMode = EApiFunctionTransactionMode.SUPPORTS): void {
		const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(service, propertyKey);

		if (!descriptor || !("value" in descriptor) || typeof descriptor.value !== "function") {
			throw ErrorException(`Generated ${functionType} service capability must be an own data function`);
		}

		this.mark(descriptor.value, functionType, entity, transactionMode);
	}

	// eslint-disable-next-line @elsikora/typescript/no-unnecessary-type-parameters
	public static resolve<T extends TApiControllerGeneratedFunction>(service: object, propertyKey: PropertyKey, functionType: TApiControllerGeneratedScopeFunctionType, entity: unknown): T {
		return this.lookup(service, propertyKey, functionType, entity).implementation as T;
	}

	/**
	 * Reads the transaction mode of a built-in decorated service function, with the same checks as resolving it.
	 * @param {object} service - Service that holds the function.
	 * @param {PropertyKey} propertyKey - Name of the function on the service.
	 * @param {TApiControllerGeneratedScopeFunctionType} functionType - Function type the built-in decorator marked.
	 * @param {unknown} entity - Entity the built-in decorator marked.
	 * @returns {EApiFunctionTransactionMode} Transaction mode the function runs in.
	 * @throws {Error} When the service has no such function protected by its built-in decorator.
	 */
	public static resolveTransactionMode(service: object, propertyKey: PropertyKey, functionType: TApiControllerGeneratedScopeFunctionType, entity: unknown): EApiFunctionTransactionMode {
		return this.lookup(service, propertyKey, functionType, entity).transactionMode;
	}

	private static lookup(service: object, propertyKey: PropertyKey, functionType: TApiControllerGeneratedScopeFunctionType, entity: unknown): { implementation: TApiControllerGeneratedFunction; transactionMode: EApiFunctionTransactionMode } {
		if (typeof entity !== "function") {
			throw ErrorException(`Generated ${functionType} entity capability must be a constructor`);
		}

		const entityConstructor: new () => IApiBaseEntity = entity as new () => IApiBaseEntity;
		const descriptor: PropertyDescriptor | undefined = ObjectFindPropertyDescriptor(service, propertyKey);

		if (!descriptor) {
			throw ErrorException(`Generated ${functionType} service function is not available`);
		}

		if (!("value" in descriptor) || typeof descriptor.value !== "function") {
			throw ErrorException(`Generated ${functionType} service capability must be a data function`);
		}

		const implementation: TApiControllerGeneratedFunction = descriptor.value as TApiControllerGeneratedFunction;
		const capability: { entity: new () => IApiBaseEntity; functionType: TApiControllerGeneratedScopeFunctionType; transactionMode: EApiFunctionTransactionMode } | undefined = this.REGISTRY.get(implementation);

		if (capability?.entity !== entityConstructor || capability.functionType !== functionType) {
			throw ErrorException(`Generated ${functionType} service function is not protected by its built-in decorator`);
		}

		return { implementation, transactionMode: capability.transactionMode };
	}
}
