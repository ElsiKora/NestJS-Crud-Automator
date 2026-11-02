import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerPathPlan, IApiControllerPathPlanParameter } from "@interface/class/api/controller/path";
import type { IApiControllerProperties } from "@interface/decorator/api";
import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
import type { CanActivate, Type } from "@nestjs/common";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { createHash } from "node:crypto";

import { DATABASE_COLUMN_TYPE_CONSTANT } from "@constant/database-column-type.constant";
import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { UNSAFE_OBJECT_PROPERTY_NAMES_CONSTANT } from "@constant/safe-object-property-names.constant";
import { EApiDtoType, EApiPropertyDescribeType, EApiRouteType } from "@enum/decorator/api";
import { DtoBuildDecorator } from "@utility/dto/build-decorator.utility";
import { ErrorException } from "@utility/error/exception.utility";

const MAXIMUM_PATH_INSTANT_PRECISION: number = 3;
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
		if (!ROW_ROUTE_TYPES.has(method)) {
			return;
		}

		if (routeConfig.dto?.[EApiDtoType.PARAMETERS]) {
			if (pathPlan.isRowPathDeclared) {
				throw ErrorException(`Controller ${pathPlan.controllerName} rowPath cannot be combined with a manual PARAMETERS DTO on the generated ${method} route`);
			}

			return;
		}

		// A single-column key on its default path keeps the generated route it always had.
		if (pathPlan.primaryFields.length === 1 && !pathPlan.isRowPathDeclared) {
			return;
		}

		const currentGuard: Type<CanActivate> | undefined = routeConfig.security?.authentication?.guard;

		for (const mapping of pathPlan.rowParameters) {
			const column: IApiEntityColumn<E> | undefined = entityMetadata.columns.find((candidate: IApiEntityColumn<E>): boolean => String(candidate.name) === mapping.field);
			const metadata: TApiPropertyDescribeProperties | undefined = column?.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] as TApiPropertyDescribeProperties | undefined;

			if (!column || column.relation || !metadata || metadata.isAutoDtoEnabled === false || metadata.type === EApiPropertyDescribeType.OBJECT || metadata.type === EApiPropertyDescribeType.RELATION) {
				throw ErrorException(`Controller ${pathPlan.controllerName} row path field "${mapping.field}" must be a described direct scalar entity field`);
			}

			if (!DtoBuildDecorator(method, metadata, entityMetadata, EApiDtoType.PARAMETERS, mapping.parameter, currentGuard)) {
				throw ErrorException(`Controller ${pathPlan.controllerName} row path field "${mapping.field}" is unavailable for the PARAMETERS DTO of the generated ${method} route`);
			}

			if (pathPlan.primaryFields.length > 1) {
				this.assertPathInstant(pathPlan.controllerName, column, metadata);
			}
		}
	}

	/**
	 * Compiles the path plan of a controller from its declared path settings.
	 * @template E - Entity type owned by the controller.
	 * @param {Type<unknown>} controller - Decorated controller class.
	 * @param {IApiEntity<E>} entityMetadata - Entity metadata.
	 * @param {IApiControllerProperties<E>} properties - Controller configuration.
	 * @returns {IApiControllerPathPlan} Validated, frozen path plan.
	 */
	public static compile<E extends IApiBaseEntity>(controller: Type<unknown>, entityMetadata: IApiEntity<E>, properties: IApiControllerProperties<E>): IApiControllerPathPlan {
		const primaryFields: ReadonlyArray<string> = Object.freeze(entityMetadata.columns.filter((column: IApiEntityColumn<E>): boolean => column.isPrimary).map((column: IApiEntityColumn<E>): string => String(column.name)));
		const isRowPathDeclared: boolean = properties.rowPath !== undefined;
		const rowFields: ReadonlyArray<string> = isRowPathDeclared ? this.readRowFields(controller.name, properties.rowPath, primaryFields) : primaryFields;
		const rowParameters: ReadonlyArray<IApiControllerPathPlanParameter> = Object.freeze(rowFields.map((field: string): IApiControllerPathPlanParameter => Object.freeze({ field, parameter: field })));
		const isDefaultRowPath: boolean = rowFields.length === primaryFields.length && rowFields.every((field: string, index: number): boolean => field === primaryFields[index]);
		const isKeyCovered: boolean = primaryFields.every((field: string): boolean => rowFields.includes(field));

		const signature: string = createHash("sha256").update(JSON.stringify({ rowParameters })).digest("hex");

		return Object.freeze({ controllerName: controller.name, isDefaultRowPath, isKeyCovered, isRowPathDeclared, primaryFields, rowParameters, signature });
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

		if (isDeclaredDate || (!isInstant && !isDateTime && metadata.type !== EApiPropertyDescribeType.DATE) || columnType === "datetime") {
			return;
		}

		const isExact: boolean = isInstant && typeof column.precision === "number" && column.precision >= 0 && column.precision <= MAXIMUM_PATH_INSTANT_PRECISION;

		if (!isExact) {
			throw ErrorException(`Controller ${controllerName} row path field "${String(column.name)}" of a composite key must be a timestamptz column with precision 0 to ${String(MAXIMUM_PATH_INSTANT_PRECISION)}: leave it out of rowPath or change the column`);
		}
	}

	private static readRowFields(controllerName: string, rawRowPath: unknown, primaryFields: ReadonlyArray<string>): ReadonlyArray<string> {
		const context: string = `Controller ${controllerName} rowPath`;

		if (!rawRowPath || typeof rawRowPath !== "object" || Array.isArray(rawRowPath)) {
			throw ErrorException(`${context} must be a plain object`);
		}

		const prototype: null | object = Object.getPrototypeOf(rawRowPath) as null | object;

		if (prototype !== null && prototype !== Object.prototype) {
			throw ErrorException(`${context} must be a plain object`);
		}

		const keys: Array<PropertyKey> = Reflect.ownKeys(rawRowPath);

		if (keys.length !== 1 || keys[0] !== "fields") {
			throw ErrorException(`${context} must contain exactly fields`);
		}

		const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(rawRowPath, "fields");

		if (!descriptor?.enumerable || !("value" in descriptor)) {
			throw ErrorException(`${context} fields must be an enumerable data property`);
		}

		const rawFields: unknown = descriptor.value;

		if (!Array.isArray(rawFields) || rawFields.length === 0) {
			throw ErrorException(`${context} fields must be a non-empty array`);
		}

		if (Reflect.ownKeys(rawFields).length !== rawFields.length + 1) {
			throw ErrorException(`${context} fields must be a dense array of data properties`);
		}

		const fields: Array<string> = [];

		for (let index: number = 0; index < rawFields.length; index++) {
			const fieldDescriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(rawFields, String(index));

			if (!fieldDescriptor?.enumerable || !("value" in fieldDescriptor)) {
				throw ErrorException(`${context} fields must be a dense array of data properties`);
			}

			const field: unknown = fieldDescriptor.value;

			if (typeof field !== "string" || field.length === 0 || UNSAFE_OBJECT_PROPERTY_NAMES_CONSTANT.has(field)) {
				throw ErrorException(`${context} fields[${String(index)}] must be a safe entity field name`);
			}

			if (!primaryFields.includes(field)) {
				throw ErrorException(`${context} field "${field}" is not a primary key column of the entity`);
			}

			if (fields.includes(field)) {
				throw ErrorException(`${context} field "${field}" is listed more than once`);
			}

			fields.push(field);
		}

		return fields;
	}
}
