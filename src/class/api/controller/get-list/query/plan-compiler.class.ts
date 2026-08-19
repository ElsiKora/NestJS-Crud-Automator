import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerGetListQueryOperator, IApiControllerGetListQueryPlan, IApiControllerGetListQueryPlanCondition, IApiControllerGetListQueryPlanFilter, IApiControllerGetListQueryPlanFilterField, IApiControllerGetListQueryPlanOrder, IApiControllerGetListQueryPlanOrderEntry, IApiControllerGetListQueryPlanOrderField } from "@interface/class/api/controller/get-list/query";
import type { IApiControllerPropertiesRouteGetListQueryFilter, IApiControllerPropertiesRouteGetListQueryOrder, IApiControllerPropertiesRouteGetListQueryOrderEntry, IApiControllerPropertiesRouteGetListQueryRequestTarget } from "@interface/decorator/api";
import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
import type { Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";
import type { ObjectLiteral } from "typeorm";
import type { ColumnMetadataArgs } from "typeorm/metadata-args/ColumnMetadataArgs";

import { createHash } from "node:crypto";

import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { FILTER_OPERATOR_REGISTRY_CONSTANT } from "@constant/filter";
import { DTO_GENERATE_CONSTANT } from "@constant/utility/dto/generate.constant";
import { EApiControllerGetListQueryFilterMissingBehavior, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiDtoType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiRouteType } from "@enum/decorator/api";
import { EFilterOperand, EFilterOperation, EFilterOrderDirection } from "@enum/filter";
import { ApiControllerGetListQueryEnumValues } from "@utility/api/controller/get-list/query/enum-values.utility";
import { FilterOrderByFromEntity } from "@utility/api/filter-order-by-from-entity.utility";
import { DtoIsPropertyShouldBeMarked } from "@utility/dto/is/property/should-be-marked.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { getMetadataArgsStorage } from "typeorm";

export class ApiControllerGetListQueryPlanCompiler {
	public static compile<E extends IApiBaseEntity>(controller: Type<unknown>, entity: ObjectLiteral, entityMetadata: IApiEntity<E>, routeConfig: TApiControllerPropertiesRoute<E, EApiRouteType.GET_LIST>): IApiControllerGetListQueryPlan | undefined {
		const queryTarget: IApiControllerPropertiesRouteGetListQueryRequestTarget<E> | undefined = routeConfig.request?.[EApiControllerRequestTarget.QUERY];

		if (!queryTarget?.filter && !queryTarget?.order) {
			return undefined;
		}

		if (routeConfig.dto?.[EApiDtoType.QUERY]) {
			throw ErrorException("Generated GET_LIST query configuration cannot be combined with a manual QUERY DTO");
		}

		const currentGuard: Type<IAuthGuard> | undefined = routeConfig.security?.authentication?.guard;
		const filterBaseline: Readonly<Record<string, IApiControllerGetListQueryPlanFilterField>> = this.buildFilterBaseline(entityMetadata, currentGuard);
		const orderBaseline: Readonly<Record<string, IApiControllerGetListQueryPlanOrderField>> = this.buildOrderBaseline(entity, entityMetadata);
		const serverOrderBaseline: ReadonlySet<string> = this.buildServerOrderBaseline(entityMetadata);
		const filter: IApiControllerGetListQueryPlanFilter = queryTarget.filter ? this.compileFilter(queryTarget.filter, filterBaseline) : Object.freeze({ fields: filterBaseline, isLegacy: true });
		const order: IApiControllerGetListQueryPlanOrder = queryTarget.order ? this.compileOrder(queryTarget.order, orderBaseline, serverOrderBaseline) : Object.freeze({ fields: orderBaseline, isLegacy: true });

		const normalizedOrder: Record<string, unknown> = {
			fields: Object.values(order.fields).map((field: IApiControllerGetListQueryPlanOrderField) => ({
				isEnabled: field.isEnabled,
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

		const normalizedPlan: object = {
			filter: {
				fields: Object.values(filter.fields).map((field: IApiControllerGetListQueryPlanFilterField) => ({
					allowedOperations: field.allowedOperations,
					defaultCondition: field.defaultCondition,
					isEnabled: field.isEnabled,
					missingBehavior: field.missingBehavior,
					path: field.path,
				})),
				isLegacy: filter.isLegacy,
				unlistedFields: filter.unlistedFields,
			},
			order: normalizedOrder,
		};
		const signature: string = createHash("sha256").update(JSON.stringify(normalizedPlan)).digest("hex");

		return Object.freeze({
			controllerName: controller.name || "AnonymousController",
			filter,
			order,
			schemaName: `${controller.name || "AnonymousController"}${entityMetadata.name ?? "UnknownResource"}GetListQuery${signature}DTO`,
			signature,
		});
	}

	private static buildFilterBaseline<E>(entityMetadata: IApiEntity<E>, currentGuard?: Type<IAuthGuard>): Readonly<Record<string, IApiControllerGetListQueryPlanFilterField>> {
		const fields: Record<string, IApiControllerGetListQueryPlanFilterField> = {};

		for (const column of entityMetadata.columns) {
			const metadata: TApiPropertyDescribeProperties | undefined = this.getPropertyMetadata(column);
			const path: string = String(column.name);

			if (!metadata || metadata.type === EApiPropertyDescribeType.OBJECT) {
				continue;
			}

			if (metadata.type !== EApiPropertyDescribeType.RELATION) {
				if (!DtoIsPropertyShouldBeMarked(EApiRouteType.GET_LIST, EApiDtoType.QUERY, path, metadata, column.isPrimary, currentGuard)) {
					continue;
				}

				fields[path] = this.createFilterField(path, metadata, this.isColumnNullable(entityMetadata.name, path, metadata));

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

				fields[nestedPath] = this.createFilterField(nestedPath, nestedMetadata, this.isColumnNullable(relationMetadata.name, nestedName, nestedMetadata));
			}
		}

		return Object.freeze(this.sortRecord(fields));
	}

	private static buildOrderBaseline<E>(entity: ObjectLiteral, entityMetadata: IApiEntity<E>): Readonly<Record<string, IApiControllerGetListQueryPlanOrderField>> {
		const fields: Record<string, IApiControllerGetListQueryPlanOrderField> = {};
		const orderFields: Record<string, keyof E> = FilterOrderByFromEntity(entity, entityMetadata, EApiRouteType.GET_LIST, EApiDtoType.QUERY);

		for (const path of Object.values(orderFields)
			.map(String)
			.toSorted((left: string, right: string): number => left.localeCompare(right))) {
			fields[path] = Object.freeze({ isEnabled: true, path });
		}

		return Object.freeze(fields);
	}

	private static buildServerOrderBaseline<E>(entityMetadata: IApiEntity<E>): ReadonlySet<string> {
		const fields: Set<string> = new Set<string>();

		for (const column of entityMetadata.columns) {
			const metadata: TApiPropertyDescribeProperties | undefined = this.getPropertyMetadata(column);

			if (!column.relation && metadata && metadata.type !== EApiPropertyDescribeType.OBJECT && metadata.type !== EApiPropertyDescribeType.RELATION) {
				fields.add(String(column.name));
			}
		}

		return Object.freeze(fields);
	}

	private static compileAllowedOperations(rawOperations: unknown, field: IApiControllerGetListQueryPlanFilterField): ReadonlyArray<EFilterOperation> {
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

		return Object.freeze(operations.toSorted((left: EFilterOperation, right: EFilterOperation): number => left.localeCompare(right)));
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

	private static compileFilter<E>(config: IApiControllerPropertiesRouteGetListQueryFilter<E>, baseline: Readonly<Record<string, IApiControllerGetListQueryPlanFilterField>>): IApiControllerGetListQueryPlanFilter {
		const rawConfig: Record<string, unknown> = this.requireRecord(config, "GET_LIST filter");

		this.requireExactKeys(rawConfig, ["fields", "unlistedFields"], "GET_LIST filter");
		this.validateUnlistedFields(config.unlistedFields, "filter");
		const configuredFields: Record<string, unknown> = this.requireRecord(config.fields, "GET_LIST filter fields");
		const fields: Record<string, IApiControllerGetListQueryPlanFilterField> = config.unlistedFields === EApiControllerGetListQueryUnlistedFields.INHERIT ? { ...baseline } : {};

		for (const [path, rawField] of Object.entries(configuredFields).toSorted(([left]: [string, unknown], [right]: [string, unknown]): number => left.localeCompare(right))) {
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
			const allowedOperations: ReadonlyArray<EFilterOperation> = this.compileAllowedOperations(field.allowedOperations, baselineField);
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
			fields: Object.freeze(this.sortRecord(fields)),
			isLegacy: false,
			unlistedFields: config.unlistedFields,
		});
	}

	private static compileOrder<E>(config: IApiControllerPropertiesRouteGetListQueryOrder<E>, baseline: Readonly<Record<string, IApiControllerGetListQueryPlanOrderField>>, serverBaseline: ReadonlySet<string>): IApiControllerGetListQueryPlanOrder {
		const rawConfig: Record<string, unknown> = this.requireRecord(config, "GET_LIST order");

		this.requireAllowedKeys(rawConfig, ["defaultOrder", "fields", "tieBreakers", "unlistedFields"], "GET_LIST order");
		this.validateUnlistedFields(config.unlistedFields, "order");
		const configuredFields: Record<string, unknown> = this.requireRecord(config.fields, "GET_LIST order fields");
		const fields: Record<string, IApiControllerGetListQueryPlanOrderField> = config.unlistedFields === EApiControllerGetListQueryUnlistedFields.INHERIT ? { ...baseline } : {};

		for (const [path, rawField] of Object.entries(configuredFields).toSorted(([left]: [string, unknown], [right]: [string, unknown]): number => left.localeCompare(right))) {
			const baselineField: IApiControllerGetListQueryPlanOrderField | undefined = baseline[path];

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
			fields: Object.freeze(this.sortRecord(fields)),
			isLegacy: false,
			...(config.tieBreakers === undefined ? {} : { tieBreakers }),
			unlistedFields: config.unlistedFields,
		});
	}

	private static compileOrderEntries<E>(rawEntries: ReadonlyArray<IApiControllerPropertiesRouteGetListQueryOrderEntry<E>> | undefined, baseline: ReadonlySet<string>, context: string): ReadonlyArray<IApiControllerGetListQueryPlanOrderEntry> {
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

			if (typeof field !== "string" || !baseline.has(field)) {
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

	private static createFilterField(path: string, metadata: TApiPropertyDescribeProperties, isNullable: boolean): IApiControllerGetListQueryPlanFilterField {
		const allowedOperations: ReadonlyArray<EFilterOperation> = Object.freeze(
			Object.values(EFilterOperation).filter((operation: EFilterOperation): boolean => {
				const descriptor: IApiControllerGetListQueryOperator = FILTER_OPERATOR_REGISTRY_CONSTANT.OPERATORS[operation];

				return descriptor.kinds.includes(metadata.type) && (descriptor.operand !== EFilterOperand.NONE || isNullable);
			}),
		);
		const planMetadata: TApiPropertyDescribeProperties = "enum" in metadata ? { ...metadata, enum: Object.freeze({ ...metadata.enum }) } : { ...metadata };

		return Object.freeze({
			allowedOperations,
			isEnabled: true,
			isNullable,
			metadata: Object.freeze(planMetadata),
			missingBehavior: EApiControllerGetListQueryFilterMissingBehavior.OMIT,
			path,
			type: metadata.type,
		});
	}

	private static getPropertyMetadata<E>(column: IApiEntityColumn<E>): TApiPropertyDescribeProperties | undefined {
		return column.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] as TApiPropertyDescribeProperties | undefined;
	}

	private static isColumnNullable(entityName: string | undefined, propertyName: string, metadata: TApiPropertyDescribeProperties): boolean {
		const column: ColumnMetadataArgs | undefined = getMetadataArgsStorage().columns.find(({ propertyName: currentPropertyName, target }: ColumnMetadataArgs): boolean => currentPropertyName === propertyName && (typeof target === "string" ? target === entityName : target.name === entityName));

		return column?.options.nullable === true || metadata.isNullable === true;
	}

	private static isGloballyDisabled(metadata: TApiPropertyDescribeProperties): boolean {
		return metadata.properties?.[EApiRouteType.GET_LIST]?.[EApiDtoType.QUERY]?.isEnabled === false;
	}

	private static isToOneRelation<E>(column: IApiEntityColumn<E>): boolean {
		return column.type === ("many-to-one" as never) || column.type === ("one-to-one" as never);
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

	private static sortRecord<T>(record: Record<string, T>): Record<string, T> {
		return Object.fromEntries(Object.entries(record).toSorted(([left]: [string, T], [right]: [string, T]): number => left.localeCompare(right)));
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
