import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerPathPlan, IApiControllerPathPlanParameter } from "@interface/class/api/controller/path";
import type { IApiControllerProperties } from "@interface/decorator/api";
import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
import type { CanActivate, Type } from "@nestjs/common";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";
import type { Token as PathPart } from "path-to-regexp";

import { createHash } from "node:crypto";

import { DATABASE_COLUMN_TYPE_CONSTANT } from "@constant/database-column-type.constant";
import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { UNSAFE_OBJECT_PROPERTY_NAMES_CONSTANT } from "@constant/safe-object-property-names.constant";
import { EApiControllerRequestTarget, EApiDtoType, EApiPropertyDescribeType, EApiRouteType } from "@enum/decorator/api";
import { ApiControllerPathIsExactInstant } from "@utility/api/controller/path/is-exact-instant.utility";
import { DtoBuildDecorator } from "@utility/dto/build-decorator.utility";
import { ErrorException } from "@utility/error/exception.utility";
// path-to-regexp stays on 8.x, the release @nestjs/core 12 pins, so route paths are parsed the way Nest matches them
import { parse } from "path-to-regexp";

interface IPathParameter {
	isOptional: boolean;
	isWildcard: boolean;
	name: string;
}

const ROW_ROUTE_TYPES: ReadonlySet<EApiRouteType> = new Set<EApiRouteType>([EApiRouteType.DELETE, EApiRouteType.GET, EApiRouteType.PARTIAL_UPDATE, EApiRouteType.UPDATE]);

export class ApiControllerPathPlanCompiler {
	/**
	 * Fails startup when an enabled generated route cannot serve the compiled path plan.
	 * It runs per enabled route, so a column left out of every enabled route's path is never checked.
	 * @template E - Entity type owned by the controller.
	 * @template R - Generated route type.
	 * @param {IApiControllerPathPlan} pathPlan - Compiled controller path plan.
	 * @param {IApiEntity<E>} entityMetadata - Entity metadata.
	 * @param {R} method - Enabled generated route type.
	 * @param {TApiControllerPropertiesRoute<E, R>} routeConfig - Route configuration.
	 * @returns {void}
	 */
	public static assertRoute<E extends IApiBaseEntity, R extends EApiRouteType>(pathPlan: IApiControllerPathPlan, entityMetadata: IApiEntity<E>, method: R, routeConfig: TApiControllerPropertiesRoute<E, R>): void {
		const isRowRoute: boolean = ROW_ROUTE_TYPES.has(method);
		const hasScope: boolean = pathPlan.scopeParameters.length > 0;
		const requestConfig: Partial<Record<EApiControllerRequestTarget, unknown>> | undefined = routeConfig.request;

		if (!isRowRoute && !hasScope) {
			if (requestConfig?.[EApiControllerRequestTarget.PARAMETERS] !== undefined) {
				throw ErrorException(`Controller ${pathPlan.controllerName} generated ${method} route configures request PARAMETERS, which requires pathScope`);
			}

			return;
		}

		if (routeConfig.dto?.[EApiDtoType.PARAMETERS]) {
			if (hasScope || pathPlan.isRowPathDeclared) {
				throw ErrorException(`Controller ${pathPlan.controllerName} pathScope and rowPath cannot be combined with a manual PARAMETERS DTO on the generated ${method} route`);
			}

			return;
		}

		if (isRowRoute) {
			if (pathPlan.rowParameters.length === 0) {
				throw ErrorException(`Controller ${pathPlan.controllerName} binds every primary key column in pathScope, so the generated ${method} route addresses no row: leave a key column out of pathScope or disable the route`);
			}

			const collision: IApiControllerPathPlanParameter | undefined = pathPlan.rowParameters.find((mapping: IApiControllerPathPlanParameter): boolean => pathPlan.scopeParameters.some((scope: IApiControllerPathPlanParameter): boolean => scope.parameter === mapping.parameter));

			if (collision) {
				throw ErrorException(`Controller ${pathPlan.controllerName} path parameter "${collision.parameter}" conflicts with the row path of the generated ${method} route`);
			}
		}

		const currentGuard: Type<CanActivate> | undefined = routeConfig.security?.authentication?.guard;
		// A single-column key on its default path keeps the generated route it always had.
		const rowMappings: ReadonlyArray<IApiControllerPathPlanParameter> = !isRowRoute || (pathPlan.primaryFields.length === 1 && !pathPlan.isRowPathDeclared && !hasScope) ? [] : pathPlan.rowParameters;

		for (const mapping of [...pathPlan.scopeParameters, ...rowMappings]) {
			const column: IApiEntityColumn<E> | undefined = entityMetadata.columns.find((candidate: IApiEntityColumn<E>): boolean => String(candidate.name) === mapping.field);
			const metadata: TApiPropertyDescribeProperties | undefined = column?.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] as TApiPropertyDescribeProperties | undefined;

			if (!column || column.relation || !metadata || metadata.isAutoDtoEnabled === false || metadata.type === EApiPropertyDescribeType.OBJECT || metadata.type === EApiPropertyDescribeType.RELATION) {
				throw ErrorException(`Controller ${pathPlan.controllerName} path field "${mapping.field}" must be a described direct scalar entity field`);
			}

			if (!DtoBuildDecorator(method, metadata, entityMetadata, EApiDtoType.PARAMETERS, mapping.parameter, currentGuard)) {
				throw ErrorException(`Controller ${pathPlan.controllerName} path field "${mapping.field}" is unavailable for the PARAMETERS DTO of the generated ${method} route`);
			}

			if (pathPlan.primaryFields.length > 1) {
				this.assertPathInstant(pathPlan.controllerName, column, metadata);
			}
		}
	}

	/**
	 * Compiles the path plan of a controller from its path and declared path settings.
	 * The rules for the path itself apply only on behalf of an enabled generated route, so a controller of custom routes keeps any path it declares. A declared setting always has its shape checked.
	 * @template E - Entity type owned by the controller.
	 * @param {Type<unknown>} controller - Decorated controller class.
	 * @param {string | undefined} controllerPath - Declared controller path.
	 * @param {IApiEntity<E>} entityMetadata - Entity metadata.
	 * @param {IApiControllerProperties<E>} properties - Controller configuration.
	 * @param {EApiRouteType} [enabledMethod] - An enabled generated route of the controller, when there is one.
	 * @returns {IApiControllerPathPlan} Validated, frozen path plan.
	 */
	public static compile<E extends IApiBaseEntity>(controller: Type<unknown>, controllerPath: string | undefined, entityMetadata: IApiEntity<E>, properties: IApiControllerProperties<E>, enabledMethod?: EApiRouteType): IApiControllerPathPlan {
		const primaryFields: ReadonlyArray<string> = Object.freeze(entityMetadata.columns.filter((column: IApiEntityColumn<E>): boolean => column.isPrimary).map((column: IApiEntityColumn<E>): string => String(column.name)));
		const pathParts: ReadonlyArray<IPathParameter> = this.readPathParameters(controllerPath ?? "");
		const scopeParameters: ReadonlyArray<IApiControllerPathPlanParameter> = this.readScopeParameters(controller.name, properties.pathScope, pathParts);

		if (enabledMethod) {
			for (const pathPart of pathParts) {
				if (pathPart.isWildcard || pathPart.isOptional) {
					throw ErrorException(`Controller ${controller.name} path parameter "${pathPart.name}" is ${pathPart.isWildcard ? "a wildcard" : "optional"}, which the generated ${enabledMethod} route cannot bind: declare a required parameter or disable the route`);
				}

				if (!scopeParameters.some((mapping: IApiControllerPathPlanParameter): boolean => mapping.parameter === pathPart.name)) {
					throw ErrorException(`Controller ${controller.name} path parameter "${pathPart.name}" is not bound to an entity field for the generated ${enabledMethod} route: declare it in pathScope.parameters or disable the route`);
				}
			}
		}

		const scopeFields: ReadonlyArray<string> = scopeParameters.map((mapping: IApiControllerPathPlanParameter): string => mapping.field);
		const isRowPathDeclared: boolean = properties.rowPath !== undefined;
		const rowFields: ReadonlyArray<string> = isRowPathDeclared ? this.readRowFields(controller.name, properties.rowPath, primaryFields, scopeFields) : primaryFields.filter((field: string): boolean => !scopeFields.includes(field));
		const rowParameters: ReadonlyArray<IApiControllerPathPlanParameter> = Object.freeze(rowFields.map((field: string): IApiControllerPathPlanParameter => Object.freeze({ field, parameter: field })));
		const isDefaultRowPath: boolean = scopeParameters.length === 0 && rowFields.length === primaryFields.length && rowFields.every((field: string, index: number): boolean => field === primaryFields[index]);
		const isKeyCovered: boolean = primaryFields.every((field: string): boolean => rowFields.includes(field) || scopeFields.includes(field));
		const signature: string = createHash("sha256").update(JSON.stringify({ rowParameters, scopeParameters })).digest("hex");

		return Object.freeze({ controllerName: controller.name, isDefaultRowPath, isKeyCovered, isRowPathDeclared, primaryFields, rowParameters, scopeParameters, signature });
	}

	/**
	 * Fails startup for a date and time key column in the path of a composite route, unless a JavaScript `Date` reproduces every stored value.
	 * @template E - Entity type owned by the controller.
	 * @param {string} controllerName - Controller class name.
	 * @param {IApiEntityColumn<E>} column - Key column in the path.
	 * @param {TApiPropertyDescribeProperties} metadata - Described column metadata.
	 * @returns {void}
	 */
	private static assertPathInstant<E>(controllerName: string, column: IApiEntityColumn<E>, metadata: TApiPropertyDescribeProperties): void {
		const columnType: string | undefined = typeof column.type === "string" ? column.type : undefined;
		const isDeclaredDate: boolean = columnType !== undefined && DATABASE_COLUMN_TYPE_CONSTANT.DATE.has(columnType);
		const isInstant: boolean = columnType !== undefined && DATABASE_COLUMN_TYPE_CONSTANT.INSTANT.has(columnType);
		const isDateTime: boolean = columnType !== undefined && DATABASE_COLUMN_TYPE_CONSTANT.DATE_TIME.has(columnType);

		if (isDeclaredDate || (!isInstant && !isDateTime && metadata.type !== EApiPropertyDescribeType.DATE)) {
			return;
		}

		if (!ApiControllerPathIsExactInstant(columnType, column.precision)) {
			throw ErrorException(`Controller ${controllerName} path field "${String(column.name)}" of a composite key must be a timestamptz column with precision 0 to 3, or a datetime column with no precision or precision 0 to 3: leave it out of rowPath or change the column`);
		}
	}

	private static collectPathParameters(pathParts: ReadonlyArray<PathPart>, parameters: Array<IPathParameter>, controllerPath: string, isOptional: boolean = false): void {
		for (const pathPart of pathParts) {
			if (pathPart.type === "text") {
				continue;
			}

			if (pathPart.type === "group") {
				this.collectPathParameters(pathPart.tokens, parameters, controllerPath, true);

				continue;
			}

			if (parameters.some((parameter: IPathParameter): boolean => parameter.name === pathPart.name)) {
				throw ErrorException(`Controller path "${controllerPath}" declares parameter "${pathPart.name}" more than once`);
			}

			parameters.push({ isOptional, isWildcard: pathPart.type === "wildcard", name: pathPart.name });
		}
	}

	private static readDataProperty(value: object, key: string, context: string): unknown {
		const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(value, key);

		if (!descriptor?.enumerable || !("value" in descriptor)) {
			throw ErrorException(`${context} property "${key}" must be an enumerable data property`);
		}

		return descriptor.value;
	}

	private static readDenseArray(value: unknown, context: string): Array<unknown> {
		if (!Array.isArray(value) || value.length === 0) {
			throw ErrorException(`${context} must be a non-empty array`);
		}

		if (Reflect.ownKeys(value).length !== value.length + 1) {
			throw ErrorException(`${context} must be a dense array of data properties`);
		}

		return Array.from({ length: value.length }, (_item: unknown, index: number): unknown => this.readDataProperty(value, String(index), context));
	}

	private static readPathParameters(controllerPath: string): ReadonlyArray<IPathParameter> {
		let pathParts: Array<PathPart>;

		try {
			pathParts = parse(controllerPath).tokens;
		} catch {
			throw ErrorException(`Controller path "${controllerPath}" is not valid route syntax`);
		}

		const parameters: Array<IPathParameter> = [];

		this.collectPathParameters(pathParts, parameters, controllerPath);

		return parameters;
	}

	private static readRowFields(controllerName: string, rawRowPath: unknown, primaryFields: ReadonlyArray<string>, scopeFields: ReadonlyArray<string>): ReadonlyArray<string> {
		const context: string = `Controller ${controllerName} rowPath`;
		const rowPath: Record<string, unknown> = this.requireRecord(rawRowPath, context, ["fields"]);
		const fields: Array<string> = [];

		for (const [index, field] of this.readDenseArray(rowPath.fields, `${context} fields`).entries()) {
			if (typeof field !== "string" || field.length === 0 || UNSAFE_OBJECT_PROPERTY_NAMES_CONSTANT.has(field)) {
				throw ErrorException(`${context} fields[${String(index)}] must be a safe entity field name`);
			}

			if (!primaryFields.includes(field)) {
				throw ErrorException(`${context} field "${field}" is not a primary key column of the entity`);
			}

			if (scopeFields.includes(field)) {
				throw ErrorException(`${context} field "${field}" is already bound by pathScope`);
			}

			if (fields.includes(field)) {
				throw ErrorException(`${context} field "${field}" is listed more than once`);
			}

			fields.push(field);
		}

		return fields;
	}

	private static readScopeParameters(controllerName: string, rawPathScope: unknown, pathParameters: ReadonlyArray<IPathParameter>): ReadonlyArray<IApiControllerPathPlanParameter> {
		if (rawPathScope === undefined) {
			return Object.freeze([]);
		}

		const context: string = `Controller ${controllerName} pathScope`;
		const pathScope: Record<string, unknown> = this.requireRecord(rawPathScope, context, ["parameters"]);
		const mappings: Array<IApiControllerPathPlanParameter> = [];

		for (const [index, rawMapping] of this.readDenseArray(pathScope.parameters, `${context} parameters`).entries()) {
			const itemContext: string = `${context} parameters[${String(index)}]`;
			const mapping: Record<string, unknown> = this.requireRecord(rawMapping, itemContext, ["field", "parameter"]);
			const { field, parameter }: Record<string, unknown> = mapping;

			if (typeof parameter !== "string" || parameter.length === 0 || UNSAFE_OBJECT_PROPERTY_NAMES_CONSTANT.has(parameter)) {
				throw ErrorException(`${itemContext} must declare a safe path parameter`);
			}

			if (!pathParameters.some((pathParameter: IPathParameter): boolean => pathParameter.name === parameter)) {
				throw ErrorException(`${context} parameter "${parameter}" is not declared by the controller path`);
			}

			if (mappings.some((existing: IApiControllerPathPlanParameter): boolean => existing.parameter === parameter)) {
				throw ErrorException(`${context} parameter "${parameter}" is bound more than once`);
			}

			if (typeof field !== "string" || field.length === 0 || UNSAFE_OBJECT_PROPERTY_NAMES_CONSTANT.has(field)) {
				throw ErrorException(`${context} parameter "${parameter}" must bind a safe entity field`);
			}

			if (mappings.some((existing: IApiControllerPathPlanParameter): boolean => existing.field === field)) {
				throw ErrorException(`${context} field "${field}" is bound more than once`);
			}

			mappings.push(Object.freeze({ field, parameter }));
		}

		const pathOrder: Array<string> = pathParameters.map((pathParameter: IPathParameter): string => pathParameter.name);

		return Object.freeze(mappings.toSorted((left: IApiControllerPathPlanParameter, right: IApiControllerPathPlanParameter): number => pathOrder.indexOf(left.parameter) - pathOrder.indexOf(right.parameter)));
	}

	private static requireRecord(value: unknown, context: string, keys: ReadonlyArray<string>): Record<string, unknown> {
		if (!value || typeof value !== "object" || Array.isArray(value)) {
			throw ErrorException(`${context} must be a plain object`);
		}

		const prototype: null | object = Object.getPrototypeOf(value) as null | object;

		if (prototype !== null && prototype !== Object.prototype) {
			throw ErrorException(`${context} must be a plain object`);
		}

		const ownKeys: Array<PropertyKey> = Reflect.ownKeys(value);

		if (ownKeys.length !== keys.length || !keys.every((key: string): boolean => ownKeys.includes(key))) {
			throw ErrorException(`${context} must contain exactly ${keys.join(", ")}`);
		}

		return Object.fromEntries(keys.map((key: string): [string, unknown] => [key, this.readDataProperty(value, key, context)]));
	}
}
