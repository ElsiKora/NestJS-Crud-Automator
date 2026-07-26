import type { IApiControllerGetListQueryAst, IApiControllerGetListQueryAstNode, IApiControllerGetListQueryOperator, IApiControllerGetListQueryPlan, IApiControllerGetListQueryPlanFilterField, IApiControllerGetListQueryRawGroup, IApiControllerGetListQueryRuntimeResult } from "@interface/class/api/controller/get-list/query";
import type { TApiFunctionGetListPropertiesWhere } from "@type/decorator/api/function";
import type { FindOperator } from "typeorm";

import { GET_LIST_QUERY_DTO_FACTORY_CONSTANT } from "@constant/factory-dto-get-list-query.constant";
import { FILTER_OPERATOR_REGISTRY_CONSTANT } from "@constant/filter";
import { DTO_GENERATE_CONSTANT } from "@constant/utility/dto/generate.constant";
import { EApiControllerGetListQueryFilterMissingBehavior, EApiPropertyDescribeType, EApiPropertyNumberType } from "@enum/decorator/api";
import { EFilterOperand, EFilterOperation, EFilterOrderDirection } from "@enum/filter";
import { BadRequestException } from "@nestjs/common";
import { ApiControllerGetListQueryEnumValues } from "@utility/api/controller/get-list/query/enum-values.utility";

export class ApiControllerGetListQueryRuntime {
	public static compileWhere<E>(ast: IApiControllerGetListQueryAst): TApiFunctionGetListPropertiesWhere<E> {
		const where: TApiFunctionGetListPropertiesWhere<E> = {};
		const whereRecord: Record<string, unknown> = where;

		for (const node of ast.nodes) {
			const descriptor: IApiControllerGetListQueryOperator = FILTER_OPERATOR_REGISTRY_CONSTANT.OPERATORS[node.operation];
			let operand: unknown;

			if (descriptor.operand === EFilterOperand.VALUE) {
				operand = node.value;
			} else if (descriptor.operand !== EFilterOperand.NONE) {
				operand = node.values;
			}

			const compiled: FindOperator<unknown> = descriptor.compile(operand);
			const path: Array<string> = node.path.split(".");

			if (path.length !== GET_LIST_QUERY_DTO_FACTORY_CONSTANT.NESTED_FILTER_PATH_SEGMENT_COUNT) {
				whereRecord[node.path] = compiled;

				continue;
			}

			const [relationName, nestedName]: Array<string | undefined> = path;

			if (!relationName || !nestedName) {
				throw new BadRequestException("INVALID_FILTER");
			}

			const relationWhere: Record<string, unknown> = (whereRecord[relationName] ?? {}) as Record<string, unknown>;

			relationWhere[nestedName] = compiled;
			whereRecord[relationName] = relationWhere;
		}

		return where;
	}

	public static parse(query: Record<string, unknown>, plan: IApiControllerGetListQueryPlan): IApiControllerGetListQueryRuntimeResult {
		const limit: number = this.parsePositiveInteger(query.limit, GET_LIST_QUERY_DTO_FACTORY_CONSTANT.MINIMUM_LIST_LENGTH, GET_LIST_QUERY_DTO_FACTORY_CONSTANT.MAXIMUM_LIST_LENGTH, "limit");
		const page: number = this.parsePositiveInteger(query.page, GET_LIST_QUERY_DTO_FACTORY_CONSTANT.MINIMUM_LIST_PAGES_COUNT, GET_LIST_QUERY_DTO_FACTORY_CONSTANT.MAXIMUM_LIST_PAGES_COUNT, "page");
		const filterQuery: Record<string, unknown> = {};

		for (const [key, value] of Object.entries(query)) {
			if (key !== "limit" && key !== "orderBy" && key !== "orderDirection" && key !== "page") {
				filterQuery[key] = value;
			}
		}

		const order: { orderBy?: string; orderDirection?: EFilterOrderDirection } = this.parseOrder(query.orderBy, query.orderDirection, plan);
		const ast: IApiControllerGetListQueryAst | undefined = plan.filter.isLegacy ? undefined : this.parseFilter(filterQuery, plan);

		return Object.freeze({
			ast,
			filterQuery: Object.freeze(filterQuery),
			limit,
			...order,
			page,
		});
	}

	private static parseFilter(query: Record<string, unknown>, plan: IApiControllerGetListQueryPlan): IApiControllerGetListQueryAst {
		const groups: Record<string, IApiControllerGetListQueryRawGroup> = {};

		for (const [key, value] of Object.entries(query)) {
			const match: null | RegExpExecArray = /^(.+)\[(operator|value|values)\]$/u.exec(key);
			const [, rawPath, rawSuffix]: Array<string | undefined> = match ?? [];

			if (!rawPath || !rawSuffix || rawPath.includes("[") || rawPath.includes("]")) {
				throw new BadRequestException("INVALID_FILTER");
			}

			const path: string = rawPath;
			const suffix: keyof IApiControllerGetListQueryRawGroup = rawSuffix as keyof IApiControllerGetListQueryRawGroup;
			const field: IApiControllerGetListQueryPlanFilterField | undefined = plan.filter.fields[path];

			if (!field?.isEnabled) {
				throw new BadRequestException("INVALID_FILTER");
			}

			const group: IApiControllerGetListQueryRawGroup = (groups[path] ??= {});

			if (group[suffix] !== undefined) {
				throw new BadRequestException("INVALID_FILTER");
			}

			group[suffix] = value;
		}

		const nodes: Array<IApiControllerGetListQueryAstNode> = [];

		for (const field of Object.values(plan.filter.fields)) {
			if (!field.isEnabled) {
				continue;
			}

			const group: IApiControllerGetListQueryRawGroup | undefined = groups[field.path];

			if (!group) {
				if (field.missingBehavior === EApiControllerGetListQueryFilterMissingBehavior.REJECT) {
					throw new BadRequestException("FILTER_REQUIRED");
				}

				if (field.missingBehavior === EApiControllerGetListQueryFilterMissingBehavior.USE_DEFAULT && field.defaultCondition) {
					nodes.push(
						Object.freeze({
							operation: field.defaultCondition.operation,
							path: field.path,
							value: field.defaultCondition.value,
							values: field.defaultCondition.values,
						}),
					);
				}

				continue;
			}

			nodes.push(this.parseGroup(field, group));
		}

		return Object.freeze({ nodes: Object.freeze(nodes) });
	}

	private static parseGroup(field: IApiControllerGetListQueryPlanFilterField, group: IApiControllerGetListQueryRawGroup): IApiControllerGetListQueryAstNode {
		if (Array.isArray(group.operator) || typeof group.operator !== "string" || !Object.values(EFilterOperation).includes(group.operator as EFilterOperation)) {
			throw new BadRequestException("INVALID_FILTER");
		}

		const operation: EFilterOperation = group.operator as EFilterOperation;

		if (!field.allowedOperations.includes(operation)) {
			throw new BadRequestException("INVALID_FILTER");
		}

		const descriptor: IApiControllerGetListQueryOperator = FILTER_OPERATOR_REGISTRY_CONSTANT.OPERATORS[operation];

		if (!descriptor.kinds.includes(field.type) || (descriptor.operand === EFilterOperand.NONE && !field.isNullable)) {
			throw new BadRequestException("INVALID_FILTER");
		}

		if (descriptor.operand === EFilterOperand.NONE) {
			if (group.value !== undefined || group.values !== undefined) {
				throw new BadRequestException("INVALID_FILTER");
			}

			return Object.freeze({ operation, path: field.path });
		}

		if (descriptor.operand === EFilterOperand.VALUE) {
			if (group.value === undefined || Array.isArray(group.value) || group.values !== undefined) {
				throw new BadRequestException("INVALID_FILTER");
			}

			return Object.freeze({
				operation,
				path: field.path,
				value: this.parseValue(group.value, field),
			});
		}

		if (group.value !== undefined || group.values === undefined) {
			throw new BadRequestException("INVALID_FILTER");
		}

		const rawValues: ReadonlyArray<unknown> = Array.isArray(group.values) ? group.values : [group.values];

		if (rawValues.length < FILTER_OPERATOR_REGISTRY_CONSTANT.VALUES_MINIMUM_OPERAND_COUNT || (descriptor.operand === EFilterOperand.PAIR && rawValues.length !== FILTER_OPERATOR_REGISTRY_CONSTANT.PAIR_OPERAND_COUNT) || (descriptor.operand === EFilterOperand.VALUES && rawValues.length > DTO_GENERATE_CONSTANT.MAXIMUM_FILTER_PROPERTIES)) {
			throw new BadRequestException("INVALID_FILTER");
		}

		return Object.freeze({
			operation,
			path: field.path,
			values: Object.freeze(rawValues.map((value: unknown): unknown => this.parseValue(value, field))),
		});
	}

	private static parseOrder(orderByValue: unknown, orderDirectionValue: unknown, plan: IApiControllerGetListQueryPlan): { orderBy?: string; orderDirection?: EFilterOrderDirection } {
		if (orderByValue === undefined && orderDirectionValue === undefined) {
			return {};
		}

		if (typeof orderByValue !== "string" || typeof orderDirectionValue !== "string") {
			throw new BadRequestException("INVALID_ORDER");
		}

		const normalizedDirection: EFilterOrderDirection = orderDirectionValue.toLowerCase() as EFilterOrderDirection;

		if (normalizedDirection !== EFilterOrderDirection.ASC && normalizedDirection !== EFilterOrderDirection.DESC) {
			throw new BadRequestException("INVALID_ORDER");
		}

		if (!plan.order.fields[orderByValue]?.isEnabled) {
			throw new BadRequestException("INVALID_ORDER");
		}

		return {
			orderBy: orderByValue,
			orderDirection: normalizedDirection,
		};
	}

	private static parsePositiveInteger(value: unknown, minimum: number, maximum: number, name: string): number {
		let parsed: number = Number.NaN;

		if (typeof value === "number") {
			parsed = value;
		} else if (typeof value === "string" && value.trim() !== "") {
			parsed = Number(value);
		}

		if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
			throw new BadRequestException(`INVALID_${name.toUpperCase()}`);
		}

		return parsed;
	}

	private static parseValue(value: unknown, field: IApiControllerGetListQueryPlanFilterField): unknown {
		const fieldType: EApiPropertyDescribeType = field.type;

		if (fieldType === EApiPropertyDescribeType.OBJECT || fieldType === EApiPropertyDescribeType.RELATION) {
			throw new BadRequestException("INVALID_FILTER");
		}

		switch (fieldType) {
			case EApiPropertyDescribeType.BOOLEAN: {
				if (value === true || value === "true" || value === "1") {
					return true;
				}

				if (value === false || value === "false" || value === "0") {
					return false;
				}

				break;
			}

			case EApiPropertyDescribeType.DATE: {
				const date: Date = value instanceof Date ? value : new Date(value as string);

				if (!Number.isNaN(date.getTime())) {
					return date;
				}

				break;
			}

			case EApiPropertyDescribeType.ENUM: {
				const enumValues: ReadonlyArray<number | string> = ApiControllerGetListQueryEnumValues("enum" in field.metadata ? field.metadata.enum : {});
				const enumValue: number | string | undefined = enumValues.find((candidate: number | string): boolean => candidate === value || (typeof candidate === "number" && typeof value === "string" && String(candidate) === value));

				if (enumValue !== undefined) {
					return enumValue;
				}

				break;
			}

			case EApiPropertyDescribeType.NUMBER: {
				let numberValue: number = Number.NaN;

				if (typeof value === "number") {
					numberValue = value;
				} else if (typeof value === "string" && value.trim() !== "") {
					numberValue = Number(value);
				}

				const isIntegerRequired: boolean = "format" in field.metadata && field.metadata.format === EApiPropertyNumberType.INTEGER;

				if (Number.isFinite(numberValue) && (!isIntegerRequired || Number.isInteger(numberValue))) {
					return numberValue;
				}

				break;
			}

			case EApiPropertyDescribeType.STRING: {
				if (typeof value === "string") {
					return value;
				}

				break;
			}

			case EApiPropertyDescribeType.UUID: {
				if (typeof value === "string" && /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/iu.test(value)) {
					return value;
				}

				break;
			}
		}

		throw new BadRequestException("INVALID_FILTER");
	}
}
