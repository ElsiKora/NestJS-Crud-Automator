import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerGetListQueryOperator, IApiControllerGetListQueryPlan, IApiControllerGetListQueryPlanCondition, IApiControllerGetListQueryPlanFilter, IApiControllerGetListQueryPlanFilterField, IApiControllerGetListQueryPlanOrder, IApiControllerGetListQueryPlanOrderEntry, IApiControllerGetListQueryPlanOrderField } from "@interface/class/api/controller/get-list/query";
import type { IApiControllerGetListQueryPlanPagination } from "@interface/class/api/controller/get-list/query/plan/pagination.interface";
import type { IApiControllerPropertiesRouteGetListQueryFilter, IApiControllerPropertiesRouteGetListQueryOrder, IApiControllerPropertiesRouteGetListQueryOrderEntry, IApiControllerPropertiesRouteGetListQueryPagination } from "@interface/decorator/api";
import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
import type { Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";
import type { TApiControllerGetListQueryCompiledOrderField } from "@type/class/api/controller/get-list/compiled/order-field.type";
import type { TApiControllerGetListQueryCompiledOrder } from "@type/class/api/controller/get-list/compiled/order.type";
import type { TApiControllerGetListQueryCompiledPlan } from "@type/class/api/controller/get-list/compiled/plan.type";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";
import type { TApiControllerGetListQueryRequestTarget } from "@type/decorator/api/controller/get-list/query/request-target.type";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeProperties } from "@type/decorator/api/property";
import type { TManualDtoPropertyMetadata } from "@type/utility/dto/manual-property-metadata.type";
import type { ObjectLiteral } from "typeorm";
import type { ColumnMetadataArgs } from "typeorm/metadata-args/ColumnMetadataArgs";
import type { EntityListenerMetadataArgs } from "typeorm/metadata-args/EntityListenerMetadataArgs";

import { createHash } from "node:crypto";

import { API_CONTROLLER_CURSOR_TOKEN_MAX_LENGTH } from "@constant/api-controller-cursor.constant";
import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { FILTER_OPERATOR_REGISTRY_CONSTANT } from "@constant/filter";
import { UNSAFE_OBJECT_PROPERTY_NAMES_CONSTANT } from "@constant/safe-object-property-names.constant";
import { DTO_GENERATE_CONSTANT } from "@constant/utility/dto/generate.constant";
import { EApiControllerGetListQueryFilterMissingBehavior, EApiControllerGetListQueryPaginationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiDtoType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { EFilterOperand, EFilterOperation, EFilterOrderDirection } from "@enum/filter";
import { EManualDtoPropertyMetadataDecorator } from "@enum/utility/manual-dto-property-metadata-decorator.enum";
import { ApiControllerGetListQueryEnumValues } from "@utility/api/controller/get-list/query/enum-values.utility";
import { ApiControllerGetListQueryResolveCursorOrderFields } from "@utility/api/controller/get-list/query/resolve-cursor-order-fields.utility";
import { FilterOrderByFromEntity } from "@utility/api/filter-order-by-from-entity.utility";
import { DtoGetDecoratorConfig } from "@utility/dto/get/decorator-config.utility";
import { DtoIsPropertyShouldBeMarked } from "@utility/dto/is/property/should-be-marked.utility";
import { GetManualDtoPropertyMetadata } from "@utility/dto/manual/property-metadata/get.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { getMetadataArgsStorage } from "typeorm";

const CURSOR_RESPONSE_PROPERTY_COUNT: number = 3;
const CURSOR_MAXIMUM_ARRAY_INDEX_PROPERTY: number = 4_294_967_294;
const CURSOR_BIGINT_COLUMN_TYPES: ReadonlySet<string> = new Set<string>(["bigint", "int8"]);
const CURSOR_BOOLEAN_COLUMN_TYPES: ReadonlySet<string> = new Set<string>(["bool", "boolean", "boolean-constructor"]);
const CURSOR_ENUM_INTEGER_COLUMN_TYPES: ReadonlySet<string> = new Set<string>(["int", "int2", "int4", "integer", "smallint"]);
const CURSOR_INTEGER_COLUMN_TYPES: ReadonlySet<string> = new Set<string>([...CURSOR_ENUM_INTEGER_COLUMN_TYPES, "number-constructor"]);
const CURSOR_NON_PERSISTED_COLUMN_MODES: ReadonlySet<string> = new Set<string>(["array", "treeChildrenCount", "virtual", "virtual-property"]);
const CURSOR_UUID_COLUMN_TYPES: ReadonlySet<string> = new Set<string>(["uuid"]);

export class ApiControllerGetListQueryPlanCompiler {
	public static compile<E extends IApiBaseEntity>(controller: Type<unknown>, entity: ObjectLiteral, entityMetadata: IApiEntity<E>, routeConfig: TApiControllerPropertiesRoute<E, EApiRouteType.GET_LIST>): IApiControllerGetListQueryPlan | undefined {
		const queryTarget: TApiControllerGetListQueryRequestTarget<E> | undefined = routeConfig.request?.[EApiControllerRequestTarget.QUERY];

		if (!queryTarget?.filter && !queryTarget?.order && !queryTarget?.pagination) {
			return undefined;
		}

		if (routeConfig.dto?.[EApiDtoType.QUERY]) {
			throw ErrorException("Generated GET_LIST query configuration cannot be combined with a manual QUERY DTO");
		}

		const currentGuard: Type<IAuthGuard> | undefined = routeConfig.security?.authentication?.guard;
		const pagination: IApiControllerGetListQueryPlanPagination<EApiControllerGetListQueryPaginationMode> = this.compilePagination(queryTarget.pagination);
		const isCursor: boolean = pagination.mode === EApiControllerGetListQueryPaginationMode.CURSOR;
		const filterBaseline: Readonly<Record<string, IApiControllerGetListQueryPlanFilterField>> = this.buildFilterBaseline(entity, entityMetadata, currentGuard, isCursor);
		const serverOrderBaseline: Readonly<Record<string, TApiControllerGetListQueryCompiledOrderField>> = this.buildServerOrderBaseline(entity, entityMetadata, isCursor);
		const orderBaseline: Readonly<Record<string, TApiControllerGetListQueryCompiledOrderField>> = this.buildOrderBaseline(entity, entityMetadata, serverOrderBaseline, isCursor);
		const filter: IApiControllerGetListQueryPlanFilter = queryTarget.filter ? this.compileFilter(queryTarget.filter, filterBaseline, isCursor) : Object.freeze({ fields: filterBaseline, isLegacy: !isCursor, ...(isCursor ? { unlistedFields: EApiControllerGetListQueryUnlistedFields.INHERIT } : {}) });
		const order: TApiControllerGetListQueryCompiledOrder = queryTarget.order ? this.compileOrder(queryTarget.order, orderBaseline, serverOrderBaseline, isCursor) : Object.freeze({ fields: orderBaseline, isLegacy: true, serverFields: serverOrderBaseline });
		const cursorFields: ReadonlyArray<string> = isCursor ? ApiControllerGetListQueryResolveCursorOrderFields(order) : Object.freeze([]);

		if (isCursor) {
			this.validateCursorPlan(entity, entityMetadata, order, cursorFields, routeConfig);
		}

		const normalizedOrder: Record<string, unknown> = {
			fields: Object.values(order.fields).map((field: TApiControllerGetListQueryCompiledOrderField) => ({
				isEnabled: field.isEnabled,
				...(isCursor ? { metadata: this.createCursorOrderFieldFingerprint(field) } : {}),
				path: field.path,
			})),
			isLegacy: order.isLegacy,
			unlistedFields: order.unlistedFields,
		};

		if (queryTarget.order?.defaultOrder !== undefined) {
			normalizedOrder.defaultOrder = order.defaultOrder;
		}

		if (queryTarget.order?.tieBreakers !== undefined) {
			normalizedOrder.tieBreakers = order.tieBreakers;
		}

		if (isCursor) {
			normalizedOrder.effectiveFields = cursorFields.map((path: string): Record<string, unknown> => {
				const field: TApiControllerGetListQueryCompiledOrderField | undefined = order.serverFields[path];

				if (!field) {
					throw ErrorException(`CURSOR GET_LIST order field "${path}" is unavailable`);
				}

				return {
					metadata: this.createCursorOrderFieldFingerprint(field),
					path,
					storage: {
						hasTransformer: field.hasTransformer,
						isArray: field.isColumnArray,
						isSelected: field.isSelected,
						isUnsigned: field.isUnsigned,
						mode: field.columnMode,
						precision: field.precision,
						scale: field.scale,
						type: field.columnType,
					},
				};
			});
		}

		const normalizedPlan: Record<string, unknown> = {
			filter: {
				fields: Object.values(filter.fields).map((field: IApiControllerGetListQueryPlanFilterField) => ({
					allowedOperations: field.allowedOperations,
					defaultCondition: field.defaultCondition,
					isEnabled: field.isEnabled,
					...(isCursor ? { metadata: this.createFieldFingerprint(field) } : {}),
					missingBehavior: field.missingBehavior,
					path: field.path,
				})),
				isLegacy: filter.isLegacy,
				unlistedFields: filter.unlistedFields,
			},
			order: normalizedOrder,
		};

		if (isCursor) {
			normalizedPlan.pagination = pagination;
		}
		const signature: string = createHash("sha256").update(JSON.stringify(normalizedPlan)).digest("hex");
		const controllerName: string = controller.name || "AnonymousController";
		const schemaName: string = `${controllerName}${entityMetadata.name ?? "UnknownResource"}GetListQuery${signature}DTO`;

		if (!isCursor) {
			const pageFields: Readonly<Record<string, IApiControllerGetListQueryPlanOrderField>> = Object.freeze(Object.fromEntries(Object.entries(order.fields).map(([path, field]: [string, TApiControllerGetListQueryCompiledOrderField]): [string, IApiControllerGetListQueryPlanOrderField] => [path, Object.freeze({ isEnabled: field.isEnabled, path: field.path })])));
			const pageOrderProperties: Record<string, unknown> = {};

			for (const [key, value] of Object.entries(order)) {
				if (key === "serverFields") {
					continue;
				}

				pageOrderProperties[key] = key === "fields" ? pageFields : value;
			}

			const pageOrder: IApiControllerGetListQueryPlanOrder = Object.freeze(pageOrderProperties) as unknown as IApiControllerGetListQueryPlanOrder;

			return Object.freeze({ controllerName, filter, order: pageOrder, schemaName, signature });
		}

		const plan: TApiControllerGetListQueryCompiledPlan<EApiControllerGetListQueryPaginationMode.CURSOR> = Object.freeze({
			controllerName,
			filter,
			order,
			pagination: pagination as IApiControllerGetListQueryPlanPagination<EApiControllerGetListQueryPaginationMode.CURSOR>,
			schemaName,
			signature,
		});

		return plan;
	}

	private static buildFilterBaseline<E>(entity: ObjectLiteral, entityMetadata: IApiEntity<E>, currentGuard: Type<IAuthGuard> | undefined, isCursor: boolean): Readonly<Record<string, IApiControllerGetListQueryPlanFilterField>> {
		const fields: Record<string, IApiControllerGetListQueryPlanFilterField> = {};

		for (const column of entityMetadata.columns) {
			const metadata: TApiPropertyDescribeProperties | undefined = this.getPropertyMetadata(column);
			const path: string = String(column.name);

			if (!metadata || metadata.type === EApiPropertyDescribeType.OBJECT) {
				continue;
			}

			if (metadata.type !== EApiPropertyDescribeType.RELATION) {
				// Direct scalar filter eligibility is independent of identity status; ordinary DTO visibility and guard checks still apply.
				if (!DtoIsPropertyShouldBeMarked(EApiRouteType.GET_LIST, EApiDtoType.QUERY, path, metadata, false, currentGuard)) {
					continue;
				}

				fields[path] = this.createFilterField(path, metadata, this.isColumnNullable(entity, entityMetadata.name, path, metadata, isCursor));

				continue;
			}

			if (!column.relation?.target || !this.isToOneRelation(column) || !DtoIsPropertyShouldBeMarked(EApiRouteType.GET_LIST, EApiDtoType.QUERY, path, metadata, column.isPrimary, currentGuard)) {
				continue;
			}

			let relationMetadata: IApiEntity<unknown>;

			try {
				relationMetadata = GenerateEntityInformation(column.relation.target);
			} catch {
				continue;
			}

			for (const relationColumn of relationMetadata.columns) {
				const nestedMetadata: TApiPropertyDescribeProperties | undefined = this.getPropertyMetadata(relationColumn);
				const nestedName: string = String(relationColumn.name);

				if (!nestedMetadata || nestedMetadata.type === EApiPropertyDescribeType.OBJECT || nestedMetadata.type === EApiPropertyDescribeType.RELATION || this.isGloballyDisabled(nestedMetadata)) {
					continue;
				}

				if (!relationColumn.isPrimary && !DtoIsPropertyShouldBeMarked(EApiRouteType.GET_LIST, EApiDtoType.QUERY, nestedName, nestedMetadata, relationColumn.isPrimary, currentGuard)) {
					continue;
				}

				const nestedPath: string = `${path}.${nestedName}`;

				fields[nestedPath] = this.createFilterField(nestedPath, nestedMetadata, this.isColumnNullable(column.relation.target, relationMetadata.name, nestedName, nestedMetadata, isCursor));
			}
		}

		return Object.freeze(this.sortRecord(fields, isCursor));
	}

	private static buildOrderBaseline<E>(entity: ObjectLiteral, entityMetadata: IApiEntity<E>, serverBaseline: Readonly<Record<string, TApiControllerGetListQueryCompiledOrderField>>, isCursor: boolean): Readonly<Record<string, TApiControllerGetListQueryCompiledOrderField>> {
		const fields: Record<string, TApiControllerGetListQueryCompiledOrderField> = {};
		const orderFields: Record<string, keyof E> = FilterOrderByFromEntity(entity, entityMetadata, EApiRouteType.GET_LIST, EApiDtoType.QUERY);

		for (const path of Object.values(orderFields)
			.map(String)
			.toSorted((left: string, right: string): number => this.compareStrings(left, right, isCursor))) {
			const field: TApiControllerGetListQueryCompiledOrderField | undefined = serverBaseline[path];

			if (field) {
				fields[path] = field;
			}
		}

		return Object.freeze(fields);
	}

	private static buildServerOrderBaseline<E>(entity: ObjectLiteral, entityMetadata: IApiEntity<E>, isCursor: boolean): Readonly<Record<string, TApiControllerGetListQueryCompiledOrderField>> {
		const fields: Record<string, TApiControllerGetListQueryCompiledOrderField> = {};

		for (const column of entityMetadata.columns) {
			const metadata: TApiPropertyDescribeProperties | undefined = this.getPropertyMetadata(column);

			if (!column.relation && metadata && metadata.type !== EApiPropertyDescribeType.OBJECT && metadata.type !== EApiPropertyDescribeType.RELATION) {
				const path: string = String(column.name);
				const columnMetadata: ColumnMetadataArgs | undefined = this.findColumnMetadata(entity, entityMetadata.name, path);

				fields[path] = this.createOrderField(path, metadata, this.isColumnNullable(entity, entityMetadata.name, path, metadata, isCursor), columnMetadata);
			}
		}

		return Object.freeze(this.sortRecord(fields, isCursor));
	}

	private static compareStrings(left: string, right: string, isCursor: boolean): number {
		if (!isCursor) {
			return left.localeCompare(right);
		}

		if (left < right) {
			return -1;
		}

		return left > right ? 1 : 0;
	}

	private static compileAllowedOperations(rawOperations: unknown, field: IApiControllerGetListQueryPlanFilterField, isCursor: boolean): ReadonlyArray<EFilterOperation> {
		if (!Array.isArray(rawOperations) || rawOperations.length === 0) {
			throw ErrorException(`Enabled GET_LIST filter field "${field.path}" requires non-empty allowedOperations`);
		}

		const operations: Array<EFilterOperation> = [];

		for (const rawOperation of rawOperations) {
			if (typeof rawOperation !== "string" || !Object.values(EFilterOperation).includes(rawOperation as EFilterOperation)) {
				throw ErrorException(`GET_LIST filter field "${field.path}" contains an unknown operation`);
			}

			const operation: EFilterOperation = rawOperation as EFilterOperation;
			const descriptor: IApiControllerGetListQueryOperator = FILTER_OPERATOR_REGISTRY_CONSTANT.OPERATORS[operation];

			if (!descriptor.kinds.includes(field.type) || (descriptor.operand === EFilterOperand.NONE && !field.isNullable)) {
				throw ErrorException(`GET_LIST filter operation "${operation}" is incompatible with field "${field.path}"`);
			}

			if (!operations.includes(operation)) {
				operations.push(operation);
			}
		}

		return Object.freeze(operations.toSorted((left: EFilterOperation, right: EFilterOperation): number => this.compareStrings(left, right, isCursor)));
	}

	private static compileDefaultCondition(rawCondition: unknown, field: IApiControllerGetListQueryPlanFilterField, allowedOperations: ReadonlyArray<EFilterOperation>): IApiControllerGetListQueryPlanCondition {
		const condition: Record<string, unknown> = this.requireRecord(rawCondition, `GET_LIST filter defaultCondition for "${field.path}"`);
		const operation: EFilterOperation = condition.operator as EFilterOperation;

		if (!allowedOperations.includes(operation)) {
			throw ErrorException(`GET_LIST filter defaultCondition operation for "${field.path}" is not allowed`);
		}

		const operand: EFilterOperand = FILTER_OPERATOR_REGISTRY_CONSTANT.OPERATORS[operation].operand;

		if (operand === EFilterOperand.NONE) {
			this.requireExactKeys(condition, ["operator"], `GET_LIST filter defaultCondition for "${field.path}"`);

			return Object.freeze({ operation });
		}

		if (operand === EFilterOperand.VALUE) {
			this.requireExactKeys(condition, ["operator", "value"], `GET_LIST filter defaultCondition for "${field.path}"`);
			this.validateStaticValue(condition.value, field);
			const value: unknown = condition.value instanceof Date ? new Date(condition.value) : condition.value;

			return Object.freeze({ operation, value });
		}

		this.requireExactKeys(condition, ["operator", "values"], `GET_LIST filter defaultCondition for "${field.path}"`);

		if (!Array.isArray(condition.values) || condition.values.length < FILTER_OPERATOR_REGISTRY_CONSTANT.VALUES_MINIMUM_OPERAND_COUNT || (operand === EFilterOperand.PAIR && condition.values.length !== FILTER_OPERATOR_REGISTRY_CONSTANT.PAIR_OPERAND_COUNT) || (operand === EFilterOperand.VALUES && condition.values.length > DTO_GENERATE_CONSTANT.MAXIMUM_FILTER_PROPERTIES)) {
			throw ErrorException(`GET_LIST filter defaultCondition for "${field.path}" has invalid operand cardinality`);
		}

		const conditionValues: Array<unknown> = (condition.values as Array<unknown>).map((value: unknown): unknown => (value instanceof Date ? new Date(value) : value));

		for (const value of conditionValues) {
			this.validateStaticValue(value, field);
		}

		return Object.freeze({ operation, values: Object.freeze([...conditionValues]) });
	}

	private static compileFilter<E>(config: IApiControllerPropertiesRouteGetListQueryFilter<E>, baseline: Readonly<Record<string, IApiControllerGetListQueryPlanFilterField>>, isCursor: boolean): IApiControllerGetListQueryPlanFilter {
		const rawConfig: Record<string, unknown> = this.requireRecord(config, "GET_LIST filter");

		this.requireExactKeys(rawConfig, ["fields", "unlistedFields"], "GET_LIST filter");
		this.validateUnlistedFields(config.unlistedFields, "filter");
		const configuredFields: Record<string, unknown> = this.requireRecord(config.fields, "GET_LIST filter fields");
		const fields: Record<string, IApiControllerGetListQueryPlanFilterField> = config.unlistedFields === EApiControllerGetListQueryUnlistedFields.INHERIT ? { ...baseline } : {};

		for (const [path, rawField] of Object.entries(configuredFields).toSorted(([left]: [string, unknown], [right]: [string, unknown]): number => this.compareStrings(left, right, isCursor))) {
			const baselineField: IApiControllerGetListQueryPlanFilterField | undefined = baseline[path];

			if (!baselineField) {
				throw ErrorException(`GET_LIST filter field "${path}" is not an enabled direct scalar or one-hop to-one scalar path`);
			}

			const field: Record<string, unknown> = this.requireRecord(rawField, `GET_LIST filter field "${path}"`);
			const isEnabled: unknown = field.isEnabled;

			if (isEnabled === false) {
				this.requireExactKeys(field, ["isEnabled"], `Disabled GET_LIST filter field "${path}"`);
				fields[path] = Object.freeze({ ...baselineField, allowedOperations: Object.freeze([]), isEnabled: false });

				continue;
			}

			if (isEnabled !== true) {
				throw ErrorException(`GET_LIST filter field "${path}" must declare isEnabled`);
			}

			this.requireAllowedKeys(field, ["allowedOperations", "defaultCondition", "isEnabled", "missingBehavior"], `GET_LIST filter field "${path}"`);
			const allowedOperations: ReadonlyArray<EFilterOperation> = this.compileAllowedOperations(field.allowedOperations, baselineField, isCursor);
			const missingBehavior: EApiControllerGetListQueryFilterMissingBehavior = (field.missingBehavior as EApiControllerGetListQueryFilterMissingBehavior | undefined) ?? EApiControllerGetListQueryFilterMissingBehavior.OMIT;

			if (!Object.values(EApiControllerGetListQueryFilterMissingBehavior).includes(missingBehavior)) {
				throw ErrorException(`GET_LIST filter field "${path}" has an invalid missingBehavior`);
			}

			let defaultCondition: IApiControllerGetListQueryPlanCondition | undefined;

			if (missingBehavior === EApiControllerGetListQueryFilterMissingBehavior.USE_DEFAULT) {
				defaultCondition = this.compileDefaultCondition(field.defaultCondition, baselineField, allowedOperations);
			} else if (field.defaultCondition !== undefined) {
				throw ErrorException(`GET_LIST filter field "${path}" can declare defaultCondition only with USE_DEFAULT`);
			}

			fields[path] = Object.freeze({
				...baselineField,
				allowedOperations,
				defaultCondition,
				isEnabled: true,
				missingBehavior,
			});
		}

		return Object.freeze({
			fields: Object.freeze(this.sortRecord(fields, isCursor)),
			isLegacy: false,
			unlistedFields: config.unlistedFields,
		});
	}

	private static compileOrder<E>(config: IApiControllerPropertiesRouteGetListQueryOrder<E>, baseline: Readonly<Record<string, TApiControllerGetListQueryCompiledOrderField>>, serverBaseline: Readonly<Record<string, TApiControllerGetListQueryCompiledOrderField>>, isCursor: boolean): TApiControllerGetListQueryCompiledOrder {
		const rawConfig: Record<string, unknown> = this.requireRecord(config, "GET_LIST order");

		this.requireAllowedKeys(rawConfig, ["defaultOrder", "fields", "tieBreakers", "unlistedFields"], "GET_LIST order");
		this.validateUnlistedFields(config.unlistedFields, "order");
		const configuredFields: Record<string, unknown> = this.requireRecord(config.fields, "GET_LIST order fields");
		const fields: Record<string, TApiControllerGetListQueryCompiledOrderField> = config.unlistedFields === EApiControllerGetListQueryUnlistedFields.INHERIT ? { ...baseline } : {};

		for (const [path, rawField] of Object.entries(configuredFields).toSorted(([left]: [string, unknown], [right]: [string, unknown]): number => this.compareStrings(left, right, isCursor))) {
			const baselineField: TApiControllerGetListQueryCompiledOrderField | undefined = baseline[path];

			if (!baselineField) {
				throw ErrorException(`GET_LIST order field "${path}" is not an enabled direct scalar path`);
			}

			const field: Record<string, unknown> = this.requireRecord(rawField, `GET_LIST order field "${path}"`);

			this.requireExactKeys(field, ["isEnabled"], `GET_LIST order field "${path}"`);

			if (field.isEnabled !== true && field.isEnabled !== false) {
				throw ErrorException(`GET_LIST order field "${path}" must declare isEnabled`);
			}

			fields[path] = Object.freeze({ ...baselineField, isEnabled: field.isEnabled });
		}
		const defaultOrder: ReadonlyArray<IApiControllerGetListQueryPlanOrderEntry> = this.compileOrderEntries(config.defaultOrder, serverBaseline, "defaultOrder");
		const tieBreakers: ReadonlyArray<IApiControllerGetListQueryPlanOrderEntry> = this.compileOrderEntries(config.tieBreakers, serverBaseline, "tieBreakers");

		for (const defaultEntry of defaultOrder) {
			const tieBreaker: IApiControllerGetListQueryPlanOrderEntry | undefined = tieBreakers.find((entry: IApiControllerGetListQueryPlanOrderEntry): boolean => entry.field === defaultEntry.field);

			if (tieBreaker && tieBreaker.direction !== defaultEntry.direction) {
				throw ErrorException(`GET_LIST order field "${defaultEntry.field}" has conflicting directions across defaultOrder and tieBreakers`);
			}
		}

		return Object.freeze({
			...(config.defaultOrder === undefined ? {} : { defaultOrder }),
			fields: Object.freeze(this.sortRecord(fields, isCursor)),
			isLegacy: false,
			serverFields: serverBaseline,
			...(config.tieBreakers === undefined ? {} : { tieBreakers }),
			unlistedFields: config.unlistedFields,
		});
	}

	private static compileOrderEntries<E>(rawEntries: ReadonlyArray<IApiControllerPropertiesRouteGetListQueryOrderEntry<E>> | undefined, baseline: Readonly<Record<string, TApiControllerGetListQueryCompiledOrderField>>, context: string): ReadonlyArray<IApiControllerGetListQueryPlanOrderEntry> {
		if (rawEntries === undefined) {
			return Object.freeze([]);
		}

		if (!Array.isArray(rawEntries)) {
			throw ErrorException(`GET_LIST order ${context} must be an array`);
		}

		const entries: Array<IApiControllerGetListQueryPlanOrderEntry> = [];
		const seenFields: Set<string> = new Set<string>();

		for (const [index, rawEntry] of rawEntries.entries()) {
			const entry: Record<string, unknown> = this.requireRecord(rawEntry, `GET_LIST order ${context}[${index}]`);
			this.requireExactKeys(entry, ["direction", "field"], `GET_LIST order ${context}[${index}]`);
			const field: unknown = entry.field;
			const direction: unknown = entry.direction;

			if (typeof field !== "string" || !baseline[field]) {
				throw ErrorException(`GET_LIST order ${context}[${index}] must target a described direct scalar entity field`);
			}

			if (direction !== EFilterOrderDirection.ASC && direction !== EFilterOrderDirection.DESC) {
				throw ErrorException(`GET_LIST order ${context}[${index}] has an invalid direction`);
			}

			if (seenFields.has(field)) {
				throw ErrorException(`GET_LIST order ${context} contains duplicate field "${field}"`);
			}

			seenFields.add(field);
			entries.push(Object.freeze({ direction, field }));
		}

		return Object.freeze(entries);
	}

	private static compilePagination(config: IApiControllerPropertiesRouteGetListQueryPagination<EApiControllerGetListQueryPaginationMode> | undefined): IApiControllerGetListQueryPlanPagination<EApiControllerGetListQueryPaginationMode> {
		if (config === undefined) {
			return Object.freeze({ mode: EApiControllerGetListQueryPaginationMode.PAGE });
		}

		const rawConfig: Record<string, unknown> = this.requireRecord(config, "GET_LIST pagination");

		this.requireExactKeys(rawConfig, ["mode"], "GET_LIST pagination");

		if (!Object.values(EApiControllerGetListQueryPaginationMode).includes(config.mode)) {
			throw ErrorException("GET_LIST pagination mode must be PAGE or CURSOR");
		}

		return Object.freeze({ mode: config.mode });
	}

	private static createCursorOrderFieldFingerprint(field: TApiControllerGetListQueryCompiledOrderField): Record<string, unknown> {
		const fingerprint: Record<string, unknown> = { type: field.type };

		if ("format" in field.metadata) {
			fingerprint.format = field.metadata.format;
		}

		if ("enum" in field.metadata) {
			const values: ReadonlyArray<number | string> = ApiControllerGetListQueryEnumValues(field.metadata.enum);
			let enumKind: string = "mixed";

			if (values.every((value: number | string): boolean => typeof value === "number")) {
				enumKind = "number";
			} else if (values.every((value: number | string): boolean => typeof value === "string")) {
				enumKind = "string";
			}

			fingerprint.enumKind = enumKind;
		}

		return fingerprint;
	}

	private static createFieldFingerprint(field: IApiControllerGetListQueryPlanFilterField | TApiControllerGetListQueryCompiledOrderField): Record<string, unknown> {
		const metadata: Record<string, unknown> = field.metadata;

		const fingerprint: Record<string, unknown> = {
			isNullable: field.isNullable,
			type: field.type,
		};

		for (const key of ["format", "identifier", "isArray", "maximum", "maxLength", "minimum", "minLength", "multipleOf", "pattern"] as const) {
			if (key in metadata) {
				fingerprint[key] = metadata[key];
			}
		}

		if ("enum" in field.metadata) {
			fingerprint.enum = ApiControllerGetListQueryEnumValues(field.metadata.enum);
		}

		return fingerprint;
	}

	private static createFilterField(path: string, metadata: TApiPropertyDescribeProperties, isNullable: boolean): IApiControllerGetListQueryPlanFilterField {
		const allowedOperations: ReadonlyArray<EFilterOperation> = Object.freeze(
			Object.values(EFilterOperation).filter((operation: EFilterOperation): boolean => {
				const descriptor: IApiControllerGetListQueryOperator = FILTER_OPERATOR_REGISTRY_CONSTANT.OPERATORS[operation];

				return descriptor.kinds.includes(metadata.type) && (descriptor.operand !== EFilterOperand.NONE || isNullable);
			}),
		);
		const planMetadata: Readonly<TApiPropertyDescribeProperties> = this.createPlanMetadata(metadata);

		return Object.freeze({
			allowedOperations,
			isEnabled: true,
			isNullable,
			metadata: planMetadata,
			missingBehavior: EApiControllerGetListQueryFilterMissingBehavior.OMIT,
			path,
			type: metadata.type,
		});
	}

	private static createOrderField(path: string, metadata: TApiPropertyDescribeProperties, isNullable: boolean, columnMetadata: ColumnMetadataArgs | undefined): TApiControllerGetListQueryCompiledOrderField {
		return Object.freeze({
			columnMode: columnMetadata?.mode ?? "unknown",
			columnType: this.normalizeColumnType(columnMetadata),
			hasTransformer: columnMetadata?.options.transformer !== undefined,
			isColumnArray: columnMetadata?.options.array === true,
			isEnabled: true,
			isNullable,
			isSelected: columnMetadata?.options.select !== false,
			isUnsigned: columnMetadata?.options.unsigned === true,
			metadata: this.createPlanMetadata(metadata),
			path,
			...(columnMetadata?.options.precision === undefined ? {} : { precision: columnMetadata.options.precision }),
			...(columnMetadata?.options.scale === undefined ? {} : { scale: columnMetadata.options.scale }),
			type: metadata.type,
		});
	}

	private static createPlanMetadata(metadata: TApiPropertyDescribeProperties): Readonly<TApiPropertyDescribeProperties> {
		const planMetadata: TApiPropertyDescribeProperties = "enum" in metadata ? { ...metadata, enum: Object.freeze({ ...metadata.enum }) } : { ...metadata };

		return Object.freeze(planMetadata);
	}

	private static findColumnMetadata(entity: IApiBaseEntity | ObjectLiteral, entityName: string | undefined, propertyName: string): ColumnMetadataArgs | undefined {
		const targets: Array<unknown> = [];

		if (typeof entity === "function") {
			let current: unknown = entity;

			while (typeof current === "function" && current !== Object) {
				targets.push(current, current.name);

				current = Object.getPrototypeOf(current) as unknown;
			}
		} else if (typeof entity.name === "string") {
			targets.push(entity.name);
		}

		if (entityName && !targets.includes(entityName)) {
			targets.push(entityName);
		}

		for (const expectedTarget of targets) {
			const column: ColumnMetadataArgs | undefined = getMetadataArgsStorage().columns.find(({ propertyName: currentPropertyName, target }: ColumnMetadataArgs): boolean => currentPropertyName === propertyName && (target === expectedTarget || (typeof expectedTarget === "string" && typeof target !== "string" && target.name === expectedTarget)));

			if (column) {
				return column;
			}
		}

		return undefined;
	}

	private static getPropertyMetadata<E>(column: IApiEntityColumn<E>): TApiPropertyDescribeProperties | undefined {
		return column.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] as TApiPropertyDescribeProperties | undefined;
	}

	private static hasAfterLoadListener(entity: IApiBaseEntity | ObjectLiteral): boolean {
		if (typeof entity !== "function") {
			return false;
		}

		const targets: Set<unknown> = new Set<unknown>();
		let current: unknown = entity;

		while (typeof current === "function" && current !== Object) {
			targets.add(current);
			current = Object.getPrototypeOf(current) as unknown;
		}

		return getMetadataArgsStorage().entityListeners.some((listener: EntityListenerMetadataArgs): boolean => listener.type === "after-load" && targets.has(listener.target));
	}

	private static hasPropertyAccessor(entity: IApiBaseEntity | ObjectLiteral | Type<unknown>, propertyName: string): boolean {
		if (typeof entity === "function") {
			try {
				const instance: object = Reflect.construct(entity, []) as object;
				const ownDescriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(instance, propertyName);

				if (ownDescriptor && !("value" in ownDescriptor)) {
					return true;
				}
			} catch {
				return true;
			}
		}

		let current: unknown = typeof entity === "function" ? Reflect.get(entity, "prototype") : undefined;

		while (current && typeof current === "object" && current !== Object.prototype) {
			const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(current, propertyName);

			if (descriptor && !("value" in descriptor)) {
				return true;
			}

			current = Object.getPrototypeOf(current) as unknown;
		}

		return false;
	}

	private static isColumnNullable(entity: IApiBaseEntity | ObjectLiteral, entityName: string | undefined, propertyName: string, metadata: TApiPropertyDescribeProperties, isCursor: boolean): boolean {
		const column: ColumnMetadataArgs | undefined = isCursor ? this.findColumnMetadata(entity, entityName, propertyName) : getMetadataArgsStorage().columns.find(({ propertyName: currentPropertyName, target }: ColumnMetadataArgs): boolean => currentPropertyName === propertyName && (typeof target === "string" ? target === entityName : target.name === entityName));

		return column?.options.nullable === true || metadata.isNullable === true;
	}

	private static isCursorEnvelopeStringMetadata(metadata: TManualDtoPropertyMetadata): boolean {
		if (metadata.decorator !== EManualDtoPropertyMetadataDecorator.STRING || !this.isManualRawResponseProperty(metadata, false, true)) {
			return false;
		}

		return metadata.properties.format === EApiPropertyStringType.STRING && metadata.properties.minLength === 1 && metadata.properties.maxLength === API_CONTROLLER_CURSOR_TOKEN_MAX_LENGTH && metadata.properties.pattern === "/^[A-Za-z0-9_-]+$/";
	}

	private static isGloballyDisabled(metadata: TApiPropertyDescribeProperties): boolean {
		return metadata.properties?.[EApiRouteType.GET_LIST]?.[EApiDtoType.QUERY]?.isEnabled === false;
	}

	private static isManualRawResponseProperty(metadata: TManualDtoPropertyMetadata, isArray: boolean, isNullable: boolean): boolean {
		const properties: Record<string, unknown> = metadata.properties;
		const hasExpectedArrayShape: boolean = isArray ? properties.isArray === true : properties.isArray !== true;
		const hasExpectedNullability: boolean = isNullable ? properties.isNullable === true : properties.isNullable !== true;

		return hasExpectedArrayShape && hasExpectedNullability && properties.isRequired === true && properties.isResponse === true && properties.isExpose !== false;
	}

	private static isToOneRelation<E>(column: IApiEntityColumn<E>): boolean {
		return column.type === ("many-to-one" as never) || column.type === ("one-to-one" as never);
	}

	private static isUnsafeCursorFieldName(fieldName: string): boolean {
		const numericName: number = Number(fieldName);

		return UNSAFE_OBJECT_PROPERTY_NAMES_CONSTANT.has(fieldName) || (Number.isInteger(numericName) && numericName >= 0 && numericName <= CURSOR_MAXIMUM_ARRAY_INDEX_PROPERTY && String(numericName) === fieldName);
	}

	private static normalizeColumnType(column: ColumnMetadataArgs | undefined): string {
		const columnType: unknown = column?.options.type;

		if (columnType === Boolean) {
			return "boolean-constructor";
		}

		if (columnType === Date) {
			return "date-constructor";
		}

		if (columnType === Number) {
			return "number-constructor";
		}

		if (columnType === String) {
			return "string-constructor";
		}

		return typeof columnType === "string" ? columnType.trim().toLowerCase() : "unknown";
	}

	private static requireAllowedKeys(value: Record<string, unknown>, allowedKeys: ReadonlyArray<string>, context: string): void {
		const invalidKey: string | undefined = Object.keys(value).find((key: string): boolean => !allowedKeys.includes(key));

		if (invalidKey) {
			throw ErrorException(`${context} contains unsupported property "${invalidKey}"`);
		}
	}

	private static requireExactKeys(value: Record<string, unknown>, expectedKeys: ReadonlyArray<string>, context: string): void {
		const actualKeys: Array<string> = Object.keys(value).toSorted((left: string, right: string): number => left.localeCompare(right));
		const normalizedExpectedKeys: Array<string> = expectedKeys.toSorted((left: string, right: string): number => left.localeCompare(right));

		if (actualKeys.length !== normalizedExpectedKeys.length || actualKeys.some((key: string, index: number): boolean => key !== normalizedExpectedKeys[index])) {
			throw ErrorException(`${context} must contain exactly ${normalizedExpectedKeys.join(", ")}`);
		}
	}

	private static requireRecord(value: unknown, context: string): Record<string, unknown> {
		if (!value || typeof value !== "object" || Array.isArray(value)) {
			throw ErrorException(`${context} must be an object`);
		}

		return value as Record<string, unknown>;
	}

	private static sortRecord<T>(record: Record<string, T>, isCursor: boolean): Record<string, T> {
		return Object.fromEntries(Object.entries(record).toSorted(([left]: [string, T], [right]: [string, T]): number => this.compareStrings(left, right, isCursor)));
	}

	private static validateCursorCustomResponseDto<E>(routeConfig: TApiControllerPropertiesRoute<E, EApiRouteType.GET_LIST>, fields: ReadonlySet<string>, order: TApiControllerGetListQueryCompiledOrder): void {
		const responseDto: unknown = routeConfig.dto?.[EApiDtoType.RESPONSE];

		if (!responseDto) {
			return;
		}

		let itemType: Type<unknown> | undefined;

		if (typeof responseDto === "function") {
			const wrapperMetadata: Map<string | symbol, TManualDtoPropertyMetadata> = GetManualDtoPropertyMetadata(Reflect.get(responseDto, "prototype") as object);
			const itemsMetadata: TManualDtoPropertyMetadata | undefined = wrapperMetadata.get("items");
			const nextCursorMetadata: TManualDtoPropertyMetadata | undefined = wrapperMetadata.get("nextCursor");
			const previousCursorMetadata: TManualDtoPropertyMetadata | undefined = wrapperMetadata.get("previousCursor");

			if (
				wrapperMetadata.size !== CURSOR_RESPONSE_PROPERTY_COUNT ||
				itemsMetadata?.decorator !== EManualDtoPropertyMetadataDecorator.OBJECT ||
				nextCursorMetadata?.decorator !== EManualDtoPropertyMetadataDecorator.STRING ||
				previousCursorMetadata?.decorator !== EManualDtoPropertyMetadataDecorator.STRING ||
				!this.isManualRawResponseProperty(itemsMetadata, true, false) ||
				Array.isArray(itemsMetadata.properties.type) ||
				typeof itemsMetadata.properties.type !== "function" ||
				itemsMetadata.properties.type === Object ||
				!this.isCursorEnvelopeStringMetadata(nextCursorMetadata) ||
				!this.isCursorEnvelopeStringMetadata(previousCursorMetadata) ||
				this.hasPropertyAccessor(responseDto, "items") ||
				this.hasPropertyAccessor(responseDto, "nextCursor") ||
				this.hasPropertyAccessor(responseDto, "previousCursor")
			) {
				throw ErrorException("CURSOR GET_LIST custom response DTO must prove the flat raw cursor envelope through Automator property metadata");
			}

			itemType = itemsMetadata.properties.type as Type<unknown>;
		} else if (typeof responseDto === "object" && "itemType" in responseDto && typeof responseDto.itemType === "function") {
			itemType = responseDto.itemType as Type<unknown>;
		}

		if (!itemType) {
			throw ErrorException("CURSOR GET_LIST custom response DTO must expose a statically provable item type");
		}

		this.validateCursorItemDto(itemType, fields, order);
	}

	private static validateCursorItemDto(itemType: Type<unknown>, fields: ReadonlySet<string>, order: TApiControllerGetListQueryCompiledOrder): void {
		const itemMetadata: Map<string | symbol, TManualDtoPropertyMetadata> = GetManualDtoPropertyMetadata(Reflect.get(itemType, "prototype") as object);

		for (const fieldName of fields) {
			const field: TApiControllerGetListQueryCompiledOrderField | undefined = order.serverFields[fieldName];
			const metadata: TManualDtoPropertyMetadata | undefined = itemMetadata.get(fieldName);
			const expectedDecorator: EManualDtoPropertyMetadataDecorator | undefined = field && field.type !== EApiPropertyDescribeType.OBJECT && field.type !== EApiPropertyDescribeType.RELATION ? (field.type as unknown as EManualDtoPropertyMetadataDecorator) : undefined;
			const expectedFormat: unknown = field && "format" in field.metadata ? field.metadata.format : undefined;
			const actualFormat: unknown = metadata && "format" in metadata.properties ? metadata.properties.format : undefined;

			if (!field || !metadata || metadata.decorator !== expectedDecorator || !this.isManualRawResponseProperty(metadata, false, false) || actualFormat !== expectedFormat || this.hasPropertyAccessor(itemType, fieldName)) {
				throw ErrorException(`CURSOR GET_LIST custom item DTO must raw-expose protected field "${fieldName}" through compatible Automator property metadata`);
			}
		}
	}

	private static validateCursorPlan<E>(entity: ObjectLiteral, entityMetadata: IApiEntity<E>, order: TApiControllerGetListQueryCompiledOrder, cursorFields: ReadonlyArray<string>, routeConfig: TApiControllerPropertiesRoute<E, EApiRouteType.GET_LIST>): void {
		const primaryColumns: Array<IApiEntityColumn<E>> = entityMetadata.columns.filter((column: IApiEntityColumn<E>): boolean => column.isPrimary);

		if (primaryColumns.length !== 1) {
			throw ErrorException("CURSOR GET_LIST requires exactly one primary column");
		}

		if (order.isLegacy) {
			throw ErrorException("CURSOR GET_LIST requires explicit order configuration");
		}

		if (this.hasAfterLoadListener(entity)) {
			throw ErrorException("CURSOR GET_LIST entity cannot declare TypeORM after-load listeners");
		}

		const primaryField: string = String(primaryColumns[0]?.name);
		const tieBreakers: ReadonlyArray<IApiControllerGetListQueryPlanOrderEntry> = order.tieBreakers ?? [];
		const finalTieBreaker: IApiControllerGetListQueryPlanOrderEntry | undefined = tieBreakers.at(-1);

		if (finalTieBreaker?.field !== primaryField) {
			throw ErrorException(`CURSOR GET_LIST requires the sole primary field "${primaryField}" as the final explicit tie-breaker`);
		}

		if ((order.defaultOrder ?? []).some((entry: IApiControllerGetListQueryPlanOrderEntry): boolean => entry.field === primaryField) || tieBreakers.slice(0, -1).some((entry: IApiControllerGetListQueryPlanOrderEntry): boolean => entry.field === primaryField) || order.fields[primaryField]?.isEnabled === true) {
			throw ErrorException(`CURSOR GET_LIST primary field "${primaryField}" may appear only as the final tie-breaker`);
		}

		const potentialFields: Set<string> = new Set<string>(cursorFields);

		for (const fieldName of potentialFields) {
			const field: TApiControllerGetListQueryCompiledOrderField | undefined = order.serverFields[fieldName];

			if (this.isUnsafeCursorFieldName(fieldName)) {
				throw ErrorException(`CURSOR GET_LIST order field "${fieldName}" is not a safe stable object property name`);
			}

			if (!field || field.isNullable || ("isArray" in field.metadata && field.metadata.isArray === true)) {
				throw ErrorException(`CURSOR GET_LIST order field "${fieldName}" must be a described non-null direct scalar field`);
			}

			this.validateCursorStorageField(field);

			if (this.hasPropertyAccessor(entity, fieldName)) {
				throw ErrorException(`CURSOR GET_LIST order field "${fieldName}" must be a raw data property, not an accessor`);
			}

			this.validateCursorResponseExposure(entityMetadata, fieldName);
		}

		this.validateCursorCustomResponseDto(routeConfig, potentialFields, order);
	}

	private static validateCursorResponseExposure<E>(entityMetadata: IApiEntity<E>, fieldName: string): void {
		const column: IApiEntityColumn<E> | undefined = entityMetadata.columns.find((candidate: IApiEntityColumn<E>): boolean => String(candidate.name) === fieldName);
		const metadata: TApiPropertyDescribeProperties | undefined = column ? this.getPropertyMetadata(column) : undefined;

		if (!column || !metadata) {
			throw ErrorException(`CURSOR GET_LIST order field "${fieldName}" must be raw-exposed in the generated response`);
		}

		const effectiveResponse: TApiPropertyDescribeDtoProperties = DtoGetDecoratorConfig(EApiRouteType.GET_LIST, metadata, EApiDtoType.RESPONSE);

		if (effectiveResponse.guard || !DtoIsPropertyShouldBeMarked(EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, fieldName, metadata, column.isPrimary) || effectiveResponse.isEnabled === false || effectiveResponse.isResponse !== true || effectiveResponse.isExpose !== true) {
			throw ErrorException(`CURSOR GET_LIST order field "${fieldName}" must be unconditionally raw-exposed in the generated response`);
		}
	}

	private static validateCursorStorageField(field: TApiControllerGetListQueryCompiledOrderField): void {
		if (field.columnType === "unknown" || CURSOR_NON_PERSISTED_COLUMN_MODES.has(field.columnMode) || field.hasTransformer || field.isColumnArray || !field.isSelected) {
			throw ErrorException(`CURSOR GET_LIST order field "${field.path}" must be a selected persisted column without a transformer`);
		}

		if (field.isUnsigned) {
			throw ErrorException(`CURSOR GET_LIST order field "${field.path}" cannot use unsigned storage in PostgreSQL v1`);
		}

		if (field.type === EApiPropertyDescribeType.BOOLEAN) {
			if (!CURSOR_BOOLEAN_COLUMN_TYPES.has(field.columnType)) {
				throw ErrorException(`CURSOR GET_LIST boolean order field "${field.path}" requires PostgreSQL boolean storage`);
			}

			return;
		}

		if (field.type === EApiPropertyDescribeType.NUMBER) {
			if (!("format" in field.metadata) || field.metadata.format !== EApiPropertyNumberType.INTEGER) {
				throw ErrorException(`CURSOR GET_LIST numeric order field "${field.path}" supports only INTEGER metadata in PostgreSQL v1`);
			}

			if (!CURSOR_INTEGER_COLUMN_TYPES.has(field.columnType)) {
				throw ErrorException(`CURSOR GET_LIST integer order field "${field.path}" requires signed PostgreSQL int2/int4 storage`);
			}

			return;
		}

		if (field.type === EApiPropertyDescribeType.STRING) {
			const format: unknown = "format" in field.metadata ? field.metadata.format : undefined;

			if (format !== EApiPropertyStringType.BIGINT_STRING) {
				throw ErrorException(`CURSOR GET_LIST string order field "${field.path}" supports only BIGINT_STRING metadata in PostgreSQL v1`);
			}

			if (!CURSOR_BIGINT_COLUMN_TYPES.has(field.columnType)) {
				throw ErrorException(`CURSOR GET_LIST bigint-string order field "${field.path}" requires signed PostgreSQL int8 storage`);
			}

			return;
		}

		if (field.type === EApiPropertyDescribeType.ENUM) {
			const enumValues: ReadonlyArray<number | string> = ApiControllerGetListQueryEnumValues("enum" in field.metadata ? field.metadata.enum : {});

			if (enumValues.length === 0 || !enumValues.every((value: number | string): boolean => typeof value === "number" && Number.isSafeInteger(value))) {
				throw ErrorException(`CURSOR GET_LIST enum order field "${field.path}" requires safe numeric values in PostgreSQL v1`);
			}

			if (!CURSOR_ENUM_INTEGER_COLUMN_TYPES.has(field.columnType)) {
				throw ErrorException(`CURSOR GET_LIST enum order field "${field.path}" requires signed PostgreSQL int2/int4 storage`);
			}

			return;
		}

		if (field.type === EApiPropertyDescribeType.UUID) {
			if (!CURSOR_UUID_COLUMN_TYPES.has(field.columnType)) {
				throw ErrorException(`CURSOR GET_LIST UUID order field "${field.path}" requires native PostgreSQL UUID storage`);
			}

			return;
		}

		throw ErrorException(`CURSOR GET_LIST order field "${field.path}" is not supported by PostgreSQL CURSOR v1`);
	}

	private static validateStaticValue(value: unknown, field: IApiControllerGetListQueryPlanFilterField): void {
		let isValid: boolean;
		const fieldType: EApiPropertyDescribeType = field.type;

		if (fieldType === EApiPropertyDescribeType.OBJECT || fieldType === EApiPropertyDescribeType.RELATION) {
			throw ErrorException(`GET_LIST filter defaultCondition for "${field.path}" must target a scalar field`);
		}

		switch (fieldType) {
			case EApiPropertyDescribeType.BOOLEAN: {
				isValid = typeof value === "boolean";

				break;
			}

			case EApiPropertyDescribeType.DATE: {
				isValid = value instanceof Date && !Number.isNaN(value.getTime());

				break;
			}

			case EApiPropertyDescribeType.ENUM: {
				const enumValues: ReadonlyArray<number | string> = ApiControllerGetListQueryEnumValues("enum" in field.metadata ? field.metadata.enum : {});

				isValid = (typeof value === "number" || typeof value === "string") && enumValues.includes(value);

				break;
			}

			case EApiPropertyDescribeType.NUMBER: {
				const isIntegerRequired: boolean = "format" in field.metadata && field.metadata.format === EApiPropertyNumberType.INTEGER;

				isValid = typeof value === "number" && Number.isFinite(value) && (!isIntegerRequired || Number.isInteger(value));

				break;
			}

			case EApiPropertyDescribeType.STRING: {
				isValid = typeof value === "string";

				break;
			}

			case EApiPropertyDescribeType.UUID: {
				isValid = typeof value === "string" && /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/iu.test(value);

				break;
			}
		}

		if (!isValid) {
			throw ErrorException(`GET_LIST filter defaultCondition for "${field.path}" has an invalid typed value`);
		}
	}

	private static validateUnlistedFields(value: EApiControllerGetListQueryUnlistedFields, section: string): void {
		if (!Object.values(EApiControllerGetListQueryUnlistedFields).includes(value)) {
			throw ErrorException(`GET_LIST ${section} requires unlistedFields INHERIT or REJECT`);
		}
	}
}
