import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerReadPlan, IApiControllerReadPlanParameter } from "@interface/class/api/controller/read";
import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
import type { Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";
import type { Token as PathPart } from "path-to-regexp";

import { createHash } from "node:crypto";

import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { UNSAFE_OBJECT_PROPERTY_NAMES_CONSTANT } from "@constant/safe-object-property-names.constant";
import { EApiControllerRequestTarget, EApiDtoType, EApiPropertyDescribeType, EApiRouteType } from "@enum/decorator/api";
import { DtoBuildDecorator } from "@utility/dto/build-decorator.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { parse } from "path-to-regexp";

export class ApiControllerReadPlanCompiler {
	public static compile<E extends IApiBaseEntity, R extends EApiRouteType>(controller: Type<unknown>, controllerPath: string | undefined, entityMetadata: IApiEntity<E>, method: R, routeConfig: TApiControllerPropertiesRoute<E, R>): IApiControllerReadPlan | undefined {
		const readDescriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(routeConfig, "read");
		const requestConfig: Partial<Record<EApiControllerRequestTarget, unknown>> | undefined = routeConfig.request;

		if (!readDescriptor) {
			if (Reflect.has(routeConfig, "read")) {
				throw ErrorException("Generated read must be an own property on the route configuration");
			}

			if (method === EApiRouteType.GET_LIST && requestConfig?.[EApiControllerRequestTarget.PARAMETERS] !== undefined) {
				throw ErrorException("GET_LIST PARAMETERS request configuration requires generated read scope");
			}

			return undefined;
		}

		const readConfig: unknown = this.readTopLevelRead(routeConfig, readDescriptor);

		if (method !== EApiRouteType.GET && method !== EApiRouteType.GET_LIST) {
			throw ErrorException("Generated read configuration is supported only for GET and GET_LIST routes");
		}

		if (routeConfig.dto?.[EApiDtoType.PARAMETERS]) {
			throw ErrorException("Generated read scope parameters cannot be combined with a manual PARAMETERS DTO");
		}

		const rawReadConfig: Record<string, unknown> = this.requireRecord(readConfig, "Generated read configuration");
		this.requireExactKeys(rawReadConfig, ["scope"], "Generated read configuration");
		const rawScope: Record<string, unknown> = this.requireRecord(this.readDataProperty(rawReadConfig, "scope", "Generated read configuration"), "Generated read scope");
		this.requireExactKeys(rawScope, ["parameters"], "Generated read scope");
		const rawParameters: Array<unknown> = this.readDenseArray(this.readDataProperty(rawScope, "parameters", "Generated read scope"), "Generated read scope parameters");

		const inheritedParameters: Array<string> = this.extractPathParameters(controllerPath ?? "");
		const inheritedParameterSet: Set<string> = new Set<string>(inheritedParameters);
		const mappedParameters: Set<string> = new Set<string>();
		const mappedFields: Set<string> = new Set<string>();
		const compiledByParameter: Map<string, IApiControllerReadPlanParameter> = new Map<string, IApiControllerReadPlanParameter>();
		const primaryIdentityParameter: string | undefined = entityMetadata.primaryKey ? String(entityMetadata.primaryKey.name) : undefined;
		const currentGuard: Type<IAuthGuard> | undefined = routeConfig.security?.authentication?.guard;

		if (method === EApiRouteType.GET && primaryIdentityParameter && inheritedParameterSet.has(primaryIdentityParameter)) {
			throw ErrorException(`Inherited controller path parameter "${primaryIdentityParameter}" conflicts with the generated GET primary identity parameter`);
		}

		for (const [index, rawMapping] of rawParameters.entries()) {
			const mapping: Record<string, unknown> = this.requireRecord(rawMapping, `Generated read scope parameters[${index}]`);
			this.requireExactKeys(mapping, ["field", "parameter"], `Generated read scope parameters[${index}]`);
			const rawParameter: unknown = this.readDataProperty(mapping, "parameter", `Generated read scope parameters[${index}]`);
			const rawField: unknown = this.readDataProperty(mapping, "field", `Generated read scope parameters[${index}]`);

			if (typeof rawParameter !== "string" || rawParameter.length === 0) {
				throw ErrorException(`Generated read scope parameters[${index}] must declare a path parameter`);
			}

			const parameter: string = rawParameter;

			this.requireSafeScopePropertyName(parameter, "path parameter");

			if (!inheritedParameterSet.has(parameter)) {
				throw ErrorException(`Generated read scope parameter "${parameter}" is not declared by the controller path`);
			}

			if (mappedParameters.has(parameter)) {
				throw ErrorException(`Generated read scope parameter "${parameter}" is mapped more than once`);
			}

			if (typeof rawField !== "string" || rawField.length === 0) {
				throw ErrorException(`Generated read scope parameter "${parameter}" must map to a direct scalar entity field`);
			}

			const field: string = rawField;

			this.requireSafeScopePropertyName(field, "entity field");

			const column: IApiEntityColumn<E> | undefined = entityMetadata.columns.find((candidate: IApiEntityColumn<E>): boolean => String(candidate.name) === field);
			const metadata: TApiPropertyDescribeProperties | undefined = column?.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] as TApiPropertyDescribeProperties | undefined;

			if (!column || column.relation || !metadata || metadata.isAutoDtoEnabled === false || metadata.type === EApiPropertyDescribeType.OBJECT || metadata.type === EApiPropertyDescribeType.RELATION) {
				throw ErrorException(`Generated read scope parameter "${parameter}" must map to a described direct scalar entity field`);
			}

			if (!DtoBuildDecorator(method, metadata, entityMetadata, EApiDtoType.PARAMETERS, parameter, currentGuard)) {
				throw ErrorException(`Generated read scope parameter "${parameter}" maps to an entity field unavailable for the route PARAMETERS DTO`);
			}

			if (mappedFields.has(field)) {
				throw ErrorException(`Generated read scope field "${field}" is mapped more than once`);
			}

			mappedParameters.add(parameter);
			mappedFields.add(field);
			compiledByParameter.set(parameter, Object.freeze({ field, parameter }));
		}

		const unmappedParameter: string | undefined = inheritedParameters.find((parameter: string): boolean => !mappedParameters.has(parameter));

		if (unmappedParameter) {
			throw ErrorException(`Inherited controller path parameter "${unmappedParameter}" is not mapped by the generated read scope`);
		}

		const parameters: ReadonlyArray<IApiControllerReadPlanParameter> = Object.freeze(
			inheritedParameters.flatMap((parameter: string): Array<IApiControllerReadPlanParameter> => {
				const compiled: IApiControllerReadPlanParameter | undefined = compiledByParameter.get(parameter);

				return compiled ? [compiled] : [];
			}),
		);
		const normalizedPlan: object = { method, parameters };
		const signature: string = createHash("sha256").update(JSON.stringify(normalizedPlan)).digest("hex");
		const controllerName: string = controller.name || "AnonymousController";

		return Object.freeze({
			controllerName,
			parameters,
			schemaName: `${controllerName}${entityMetadata.name ?? "UnknownResource"}${method === EApiRouteType.GET ? "Get" : "GetList"}Parameters${signature}DTO`,
			signature,
		});
	}

	private static collectPathParameters(pathParts: ReadonlyArray<PathPart>, parameters: Array<string>, isOptionalGroup: boolean = false): void {
		for (const pathPart of pathParts) {
			if (pathPart.type === "text") {
				continue;
			}

			if (pathPart.type === "group") {
				this.collectPathParameters(pathPart.tokens, parameters, true);
				continue;
			}

			this.requireSafeScopePropertyName(pathPart.name, "controller path parameter");

			if (pathPart.type === "wildcard") {
				throw ErrorException(`Controller path wildcard parameter "${pathPart.name}" cannot be used by generated read scope`);
			}

			if (isOptionalGroup) {
				throw ErrorException(`Controller path optional parameter "${pathPart.name}" cannot be used by generated read scope`);
			}

			if (parameters.includes(pathPart.name)) {
				throw ErrorException(`Controller path parameter "${pathPart.name}" is declared more than once`);
			}

			parameters.push(pathPart.name);
		}
	}

	private static extractPathParameters(path: string): Array<string> {
		const parameters: Array<string> = [];
		let pathParts: Array<PathPart>;

		try {
			pathParts = parse(path).tokens;
		} catch {
			throw ErrorException(`Controller path "${path}" is not valid route syntax`);
		}

		this.collectPathParameters(pathParts, parameters);

		return parameters;
	}

	private static readDataProperty(value: object, key: string, context: string): unknown {
		const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(value, key);

		if (!descriptor?.enumerable || !("value" in descriptor)) {
			throw ErrorException(`${context} property "${key}" must be an enumerable data property`);
		}

		return descriptor.value;
	}

	private static readDenseArray(value: unknown, context: string): Array<unknown> {
		if (!Array.isArray(value)) {
			throw ErrorException(`${context} must be a non-empty array`);
		}

		const lengthDescriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(value, "length");
		const length: unknown = lengthDescriptor && "value" in lengthDescriptor ? lengthDescriptor.value : undefined;

		if (length === 0) {
			throw ErrorException(`${context} must be a non-empty array`);
		}

		if (!Number.isSafeInteger(length) || (length as number) < 0 || Reflect.ownKeys(value).length !== (length as number) + 1) {
			throw ErrorException(`${context} must be a non-empty dense array of data properties`);
		}

		const items: Array<unknown> = [];

		for (let index: number = 0; index < (length as number); index++) {
			const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(value, String(index));

			if (!descriptor?.enumerable || !("value" in descriptor)) {
				throw ErrorException(`${context} must be a non-empty dense array of data properties`);
			}

			items.push(descriptor.value);
		}

		return items;
	}

	private static readTopLevelRead(routeConfig: object, descriptor: PropertyDescriptor): unknown {
		const prototype: null | object = Object.getPrototypeOf(routeConfig) as null | object;

		if (prototype !== null && prototype !== Object.prototype) {
			throw ErrorException("Generated read route configuration must be a plain object");
		}

		if (Reflect.ownKeys(routeConfig).some((key: PropertyKey): boolean => typeof key === "symbol")) {
			throw ErrorException("Generated read route configuration must not contain symbol keys");
		}

		if (!descriptor.enumerable || !("value" in descriptor)) {
			throw ErrorException("Generated read must be an enumerable data property on the route configuration");
		}

		return descriptor.value;
	}

	private static requireExactKeys(value: Record<string, unknown>, expectedKeys: ReadonlyArray<string>, context: string): void {
		const actualKeys: Array<string> = Reflect.ownKeys(value)
			.filter((key: PropertyKey): key is string => typeof key === "string")
			.toSorted((left: string, right: string): number => left.localeCompare(right));
		const normalizedExpectedKeys: Array<string> = expectedKeys.toSorted((left: string, right: string): number => left.localeCompare(right));

		if (actualKeys.length !== normalizedExpectedKeys.length || actualKeys.some((key: string, index: number): boolean => key !== normalizedExpectedKeys[index])) {
			throw ErrorException(`${context} must contain exactly ${normalizedExpectedKeys.join(", ")}`);
		}
	}

	private static requireRecord(value: unknown, context: string): Record<string, unknown> {
		if (!value || typeof value !== "object" || Array.isArray(value)) {
			throw ErrorException(`${context} must be an object`);
		}

		const prototype: null | object = Object.getPrototypeOf(value) as null | object;

		if (prototype !== null && prototype !== Object.prototype) {
			throw ErrorException(`${context} must be a plain object`);
		}

		for (const key of Reflect.ownKeys(value)) {
			if (typeof key !== "string") {
				throw ErrorException(`${context} must contain string keys only`);
			}

			const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(value, key);

			if (!descriptor?.enumerable || !("value" in descriptor)) {
				throw ErrorException(`${context} must contain enumerable data properties only`);
			}
		}

		return value as Record<string, unknown>;
	}

	private static requireSafeScopePropertyName(name: string, context: string): void {
		if (UNSAFE_OBJECT_PROPERTY_NAMES_CONSTANT.has(name)) {
			throw ErrorException(`Generated read scope ${context} "${name}" is not a safe property name`);
		}
	}
}
