import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationResourceDefinition } from "@interface/class/api/authorization";

/**
 * The resource definitions of every IAM namespace, filled at bootstrap from each IAM controller. Policy document
 * validation reads it to check `resource.*` condition keys against the fields a namespace maps. It is one registry per
 * process, so a class-validator decorator outside dependency injection reads the same definitions.
 */
export class ApiAuthorizationIamResourceDefinitionRegistry {
	private static instance: ApiAuthorizationIamResourceDefinitionRegistry | undefined;

	private readonly definitions: Map<string, Set<IApiAuthorizationResourceDefinition<IApiBaseEntity>>> = new Map<string, Set<IApiAuthorizationResourceDefinition<IApiBaseEntity>>>();

	/**
	 * Returns the registry of the process.
	 * @returns {ApiAuthorizationIamResourceDefinitionRegistry} The registry.
	 */
	public static getInstance(): ApiAuthorizationIamResourceDefinitionRegistry {
		ApiAuthorizationIamResourceDefinitionRegistry.instance ??= new ApiAuthorizationIamResourceDefinitionRegistry();

		return ApiAuthorizationIamResourceDefinitionRegistry.instance;
	}

	/**
	 * Forgets every definition.
	 */
	public clear(): void {
		this.definitions.clear();
	}

	/**
	 * Returns the definitions registered for a namespace.
	 * @param {string} namespace - IAM policy namespace.
	 * @returns {ReadonlyArray<IApiAuthorizationResourceDefinition<IApiBaseEntity>>} Its definitions, none when the namespace is unknown.
	 */
	public get(namespace: string): ReadonlyArray<IApiAuthorizationResourceDefinition<IApiBaseEntity>> {
		return [...(this.definitions.get(namespace) ?? [])];
	}

	/**
	 * Tells whether a namespace has a registered definition.
	 * @param {string} namespace - IAM policy namespace.
	 * @returns {boolean} Whether some definition is registered for it.
	 */
	public has(namespace: string): boolean {
		return (this.definitions.get(namespace)?.size ?? 0) > 0;
	}

	/**
	 * Registers the resource definition of an IAM controller under its namespace; a definition registered twice is kept once.
	 * @template E - Entity type.
	 * @param {IApiAuthorizationResourceDefinition<E>} definition - Resource definition.
	 */
	public register<E extends IApiBaseEntity>(definition: IApiAuthorizationResourceDefinition<E>): void {
		let namespaceDefinitions: Set<IApiAuthorizationResourceDefinition<IApiBaseEntity>> | undefined = this.definitions.get(definition.namespace);

		if (!namespaceDefinitions) {
			namespaceDefinitions = new Set<IApiAuthorizationResourceDefinition<IApiBaseEntity>>();
			this.definitions.set(definition.namespace, namespaceDefinitions);
		}

		namespaceDefinitions.add(definition);
	}
}
