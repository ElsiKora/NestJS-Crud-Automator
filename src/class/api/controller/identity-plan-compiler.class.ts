import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerIdentityPlan } from "@interface/class/api/controller/identity-plan.interface";
import type { IApiControllerReadPlan } from "@interface/class/api/controller/read";
import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
import type { Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";
import type { Token as PathPart } from "path-to-regexp";

import { createHash } from "node:crypto";

import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { UNSAFE_OBJECT_PROPERTY_NAMES_CONSTANT } from "@constant/safe-object-property-names.constant";
import { EApiDtoType, EApiPropertyDescribeType, EApiRouteType } from "@enum/decorator/api";
import { DtoBuildDecorator } from "@utility/dto/build-decorator.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { parse } from "path-to-regexp";

const IDENTITY_PARAMETER_PATTERN: RegExp = /^[A-Za-z_$][\w$]*$/u;

export class ApiControllerIdentityPlanCompiler {
	public static compile<E extends IApiBaseEntity, R extends EApiRouteType>(controller: Type<unknown>, controllerPath: string | undefined, entityMetadata: IApiEntity<E>, method: R, routeConfig: TApiControllerPropertiesRoute<E, R>, readPlan?: IApiControllerReadPlan): IApiControllerIdentityPlan | undefined {
		const identityDescriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(routeConfig, "identity");

		if (!identityDescriptor) {
			if (Reflect.has(routeConfig, "identity")) {
				throw ErrorException("Generated identity must be an own property on the route configuration");
			}

			return undefined;
		}

		const rawIdentity: unknown = this.readTopLevelIdentity(routeConfig, identityDescriptor);

		if (method !== EApiRouteType.GET) {
			throw ErrorException("Generated identity configuration is supported only for GET routes");
		}

		if (routeConfig.dto?.[EApiDtoType.PARAMETERS]) {
			throw ErrorException("Generated identity cannot be combined with a manual PARAMETERS DTO");
		}

		const parameter: string = this.readParameter(rawIdentity);
		const primaryColumn: IApiEntityColumn<E> | undefined = entityMetadata.primaryKey;
		const primaryMetadata: TApiPropertyDescribeProperties | undefined = primaryColumn?.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] as TApiPropertyDescribeProperties | undefined;

		if (!primaryColumn || primaryColumn.relation || !primaryMetadata || primaryMetadata.type === EApiPropertyDescribeType.OBJECT || primaryMetadata.type === EApiPropertyDescribeType.RELATION) {
			throw ErrorException("Generated identity requires a described direct scalar primary entity field");
		}

		const field: string = String(primaryColumn.name);
		const inheritedParameters: ReadonlySet<string> = this.extractPathParameters(controllerPath ?? "");

		if (inheritedParameters.size > 0 && !readPlan) {
			throw ErrorException("Generated identity on a controller path with inherited parameters requires generated read scope mappings");
		}

		if (inheritedParameters.has(parameter)) {
			throw ErrorException(`Generated identity parameter "${parameter}" conflicts with an inherited controller path parameter`);
		}

		if (parameter !== field && inheritedParameters.has(field)) {
			throw ErrorException(`Inherited controller path parameter "${field}" is ambiguous with generated identity parameter "${parameter}"`);
		}

		const currentGuard: Type<IAuthGuard> | undefined = routeConfig.security?.authentication?.guard;

		if (!DtoBuildDecorator(method, primaryMetadata, entityMetadata, EApiDtoType.PARAMETERS, parameter, currentGuard)) {
			throw ErrorException(`Generated identity parameter "${parameter}" maps to a primary entity field unavailable for the route PARAMETERS DTO`);
		}

		const normalizedPlan: object = { field, parameter };
		const signature: string = createHash("sha256").update(JSON.stringify(normalizedPlan)).digest("hex");
		const controllerName: string = controller.name || "AnonymousController";

		return Object.freeze({
			controllerName,
			field,
			parameter,
			schemaName: `${controllerName}${entityMetadata.name ?? "UnknownResource"}GetIdentity${signature}DTO`,
			signature,
		});
	}

	private static collectPathParameters(pathParts: ReadonlyArray<PathPart>, parameters: Set<string>): void {
		for (const pathPart of pathParts) {
			if (pathPart.type === "text") {
				continue;
			}

			if (pathPart.type === "group") {
				this.collectPathParameters(pathPart.tokens, parameters);
				continue;
			}

			parameters.add(pathPart.name);
		}
	}

	private static extractPathParameters(path: string): ReadonlySet<string> {
		const parameters: Set<string> = new Set<string>();
		let pathParts: Array<PathPart>;

		try {
			pathParts = parse(path).tokens;
		} catch {
			throw ErrorException(`Controller path "${path}" is not valid route syntax`);
		}

		this.collectPathParameters(pathParts, parameters);

		return parameters;
	}

	private static readParameter(value: unknown): string {
		if (!value || typeof value !== "object" || Array.isArray(value)) {
			throw ErrorException("Generated identity configuration must be a plain object");
		}

		const prototype: null | object = Object.getPrototypeOf(value) as null | object;

		if (prototype !== null && prototype !== Object.prototype) {
			throw ErrorException("Generated identity configuration must be a plain object");
		}

		const keys: Array<PropertyKey> = Reflect.ownKeys(value);

		if (keys.length !== 1 || keys[0] !== "parameter") {
			throw ErrorException("Generated identity configuration must contain exactly one string key: parameter");
		}

		const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(value, "parameter");

		if (!descriptor?.enumerable || !("value" in descriptor)) {
			throw ErrorException("Generated identity parameter must be an enumerable data property");
		}

		const parameter: unknown = descriptor.value;

		if (typeof parameter !== "string" || !IDENTITY_PARAMETER_PATTERN.test(parameter) || UNSAFE_OBJECT_PROPERTY_NAMES_CONSTANT.has(parameter)) {
			throw ErrorException("Generated identity parameter must be a safe simple identifier");
		}

		return parameter;
	}

	private static readTopLevelIdentity(routeConfig: object, descriptor: PropertyDescriptor): unknown {
		const prototype: null | object = Object.getPrototypeOf(routeConfig) as null | object;

		if (prototype !== null && prototype !== Object.prototype) {
			throw ErrorException("Generated identity route configuration must be a plain object");
		}

		if (Reflect.ownKeys(routeConfig).some((key: PropertyKey): boolean => typeof key === "symbol")) {
			throw ErrorException("Generated identity route configuration must not contain symbol keys");
		}

		if (!descriptor.enumerable || !("value" in descriptor)) {
			throw ErrorException("Generated identity must be an enumerable data property on the route configuration");
		}

		return descriptor.value;
	}
}
