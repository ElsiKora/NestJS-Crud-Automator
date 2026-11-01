import type { IApiControllerGetListQueryAst, IApiControllerGetListQueryAstNode, IApiControllerGetListQueryOperator, IApiControllerGetListQueryPlan, IApiControllerGetListQueryPlanFilterField, IApiControllerGetListQueryPlanOrderEntry, IApiControllerGetListQueryRawGroup, IApiControllerGetListQueryRuntimeResult } from "@interface/class/api/controller/get-list/query";
import type { TApiFunctionGetListPropertiesWhere } from "@type/decorator/api/function";
import type { FindOperator } from "typeorm";

import { GET_LIST_QUERY_DTO_FACTORY_CONSTANT } from "@constant/factory-dto-get-list-query.constant";
import { FILTER_OPERATOR_REGISTRY_CONSTANT } from "@constant/filter";
import { DTO_GENERATE_CONSTANT } from "@constant/utility/dto/generate.constant";
import { EApiControllerGetListQueryFilterMissingBehavior, EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import { EFilterOperand, EFilterOperation, EFilterOrderDirection } from "@enum/filter";
import { BadRequestException } from "@nestjs/common";
import { ApiControllerGetListQueryGetPaginationMode } from "@utility/api/controller/get-list/query/get-pagination-mode.utility";
import { ApiControllerGetListQueryParseValue } from "@utility/api/controller/get-list/query/parse-value.utility";
import { EnumIsValue } from "@utility/enum/is-value.utility";

// A date-time filter value is a calendar date, or a date, a "T" or a space, a time of day, and an optional `Z` or numeric offset with minutes.
const DATE_VALUE_PATTERN: RegExp = /^\d{4}-\d{2}-\d{2}$/u;
const DATE_VALUE_LENGTH: number = "YYYY-MM-DD".length;
const TIME_VALUE_PATTERN: RegExp = /^[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?$/iu;
const ZONE_VALUE_PATTERN: RegExp = /(?:Z|[+-]\d{2}:?\d{2})$/iu;
// Years the database and the cursor token both accept.
const DATE_TIME_VALUE_MAXIMUM_YEAR: number = 9999;

export class ApiControllerGetListQueryRuntime {
	/**
	 * Rejects a client filter value on a date or time column that names no single calendar date-time, on every GET_LIST route.
	 * A value is a calendar date or a date-time of a year from 0001 to 9999 that exists in the calendar; on an instant column a date-time also names its zone with `Z` or a numeric offset with minutes. An operator that takes no value is not checked.
	 * @param {Record<string, unknown>} query - Query as the request carries it
	 * @param {ReadonlyMap<string, boolean>} dateTimePaths - Filter paths over date and time columns, each with whether its column stores an exact instant
	 * @throws {BadRequestException} INVALID_FILTER when a value of such a path is not such a date-time
	 */
	public static assertDateTimeFilterValues(query: Record<string, unknown>, dateTimePaths: ReadonlyMap<string, boolean>): void {
		for (const [path, isInstant] of dateTimePaths) {
			const operation: unknown = query[`${path}[operator]`];

			if (!EnumIsValue(EFilterOperation, operation) || FILTER_OPERATOR_REGISTRY_CONSTANT.OPERATORS[operation].operand === EFilterOperand.NONE) {
				continue;
			}

			const values: ReadonlyArray<unknown> = [query[`${path}[value]`], query[`${path}[values]`]].flat();

			if (values.some((value: unknown): boolean => typeof value === "string" && !this.isDateTimeFilterValue(value, isInstant))) {
				throw new BadRequestException("INVALID_FILTER");
			}
		}
	}

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
				throw new BadRequestException("FILTER_NOT_VALID");
			}

			const relationWhere: Record<string, unknown> = (whereRecord[relationName] ?? {}) as Record<string, unknown>;

			relationWhere[nestedName] = compiled;
			whereRecord[relationName] = relationWhere;
		}

		return where;
	}

	/**
	 * Parses a GET_LIST query against its compiled plan.
	 * @param {Record<string, unknown>} query - Query as the request carries it
	 * @param {IApiControllerGetListQueryPlan} plan - Compiled query plan of the route
	 * @returns {IApiControllerGetListQueryRuntimeResult} The parsed query
	 */
	public static parse(query: Record<string, unknown>, plan: IApiControllerGetListQueryPlan): IApiControllerGetListQueryRuntimeResult {
		const limit: number = this.parsePositiveInteger(query.limit, GET_LIST_QUERY_DTO_FACTORY_CONSTANT.MINIMUM_LIST_LENGTH, GET_LIST_QUERY_DTO_FACTORY_CONSTANT.MAXIMUM_LIST_LENGTH, "limit");
		const paginationMode: EApiControllerGetListQueryPaginationMode = ApiControllerGetListQueryGetPaginationMode(plan);
		const isCursor: boolean = paginationMode === EApiControllerGetListQueryPaginationMode.CURSOR;
		const page: number | undefined = isCursor ? undefined : this.parsePositiveInteger(query.page, GET_LIST_QUERY_DTO_FACTORY_CONSTANT.MINIMUM_LIST_PAGES_COUNT, GET_LIST_QUERY_DTO_FACTORY_CONSTANT.MAXIMUM_LIST_PAGES_COUNT, "page");
		const cursor: { after?: string; before?: string } = isCursor ? this.parseCursor(query.after, query.before, query.page) : {};
		const filterQuery: Record<string, unknown> = {};

		for (const [key, value] of Object.entries(query)) {
			const isCursorDirection: boolean = isCursor && (key === "after" || key === "before");

			if (!isCursorDirection && key !== "limit" && key !== "orderBy" && key !== "orderDirection" && key !== "page") {
				filterQuery[key] = value;
			}
		}

		const order: { orderBy?: string; orderDirection?: EFilterOrderDirection } = this.parseOrder(query.orderBy, query.orderDirection, plan);
		const ast: IApiControllerGetListQueryAst | undefined = plan.filter.isLegacy ? undefined : this.parseFilter(filterQuery, plan);
		const hasCompoundOrder: boolean = plan.order.defaultOrder !== undefined || plan.order.tieBreakers !== undefined;

		return Object.freeze({
			ast,
			...cursor,
			filterQuery: Object.freeze(filterQuery),
			limit,
			...(hasCompoundOrder ? { order: this.compileOrder(order.orderBy, order.orderDirection, plan) } : {}),
			...order,
			page,
			...(isCursor ? { paginationMode } : {}),
		}) as unknown as IApiControllerGetListQueryRuntimeResult;
	}

	private static compileOrder(orderBy: string | undefined, orderDirection: EFilterOrderDirection | undefined, plan: IApiControllerGetListQueryPlan): ReadonlyArray<IApiControllerGetListQueryPlanOrderEntry> {
		const configuredEntries: ReadonlyArray<IApiControllerGetListQueryPlanOrderEntry> = orderBy && orderDirection ? [{ direction: orderDirection, field: orderBy }, ...(plan.order.tieBreakers ?? [])] : [...(plan.order.defaultOrder ?? []), ...(plan.order.tieBreakers ?? [])];
		const fields: Set<string> = new Set<string>();
		const entries: Array<IApiControllerGetListQueryPlanOrderEntry> = [];

		for (const entry of configuredEntries) {
			if (!fields.has(entry.field)) {
				fields.add(entry.field);
				entries.push(Object.freeze({ direction: entry.direction, field: entry.field }));
			}
		}

		return Object.freeze(entries);
	}

	/**
	 * Tells whether a filter value names one calendar date-time the database accepts.
	 * A date-time without a zone takes the zone of whoever parses it, which names no single instant.
	 * @param {string} value - The raw filter value
	 * @param {boolean} isInstant - Whether the column stores an exact instant
	 * @returns {boolean} True when the value is a calendar date, or a date-time of an existing calendar time that names its zone where the column needs one
	 */
	private static isDateTimeFilterValue(value: string, isInstant: boolean): boolean {
		const datePart: string = value.slice(0, DATE_VALUE_LENGTH);
		const zonePart: string = ZONE_VALUE_PATTERN.exec(value.slice(DATE_VALUE_LENGTH))?.[0] ?? "";
		const timePart: string = value.slice(DATE_VALUE_LENGTH, value.length - zonePart.length);

		if (!DATE_VALUE_PATTERN.test(datePart) || (timePart === "" ? zonePart !== "" : !TIME_VALUE_PATTERN.test(timePart)) || (isInstant && timePart !== "" && zonePart === "")) {
			return false;
		}

		const [year = 0, month = 0, day = 0]: Array<number> = datePart.split("-").map(Number);
		const [hour = "00", minute = "00", second = "00"]: Array<string> = timePart === "" ? [] : timePart.slice(1).split(":");
		// Date.UTC reads years 0 to 99 as 1900 to 1999, so the year is set on its own.
		const calendar: Date = new Date(0);

		calendar.setUTCFullYear(year, month - 1, day);
		// Date setters drop the fraction of a second.
		calendar.setUTCHours(Number(hour), Number(minute), Number(second));

		// A date or time that does not exist rolls over into another one and so does not round-trip.
		const isCalendarValid: boolean = calendar.toISOString().startsWith(`${datePart}T${hour}:${minute}:${second.slice(0, "SS".length)}`);
		// A zone moves the instant itself, which must stay within the same years.
		const instantYear: number = new Date(value).getUTCFullYear();

		// An offset beyond what JavaScript parses names no instant, and its NaN year fails the range as well.
		return isCalendarValid && year >= 1 && (zonePart === "" || (instantYear >= 1 && instantYear <= DATE_TIME_VALUE_MAXIMUM_YEAR));
	}

	private static parseCursor(afterValue: unknown, beforeValue: unknown, pageValue: unknown): { after?: string; before?: string } {
		if (pageValue !== undefined) {
			throw new BadRequestException("CURSOR_NOT_VALID");
		}

		if (afterValue !== undefined && beforeValue !== undefined) {
			throw new BadRequestException("CURSOR_NOT_VALID");
		}

		if (afterValue !== undefined) {
			if (typeof afterValue !== "string" || afterValue.length === 0) {
				throw new BadRequestException("CURSOR_NOT_VALID");
			}

			return { after: afterValue };
		}

		if (beforeValue !== undefined) {
			if (typeof beforeValue !== "string" || beforeValue.length === 0) {
				throw new BadRequestException("CURSOR_NOT_VALID");
			}

			return { before: beforeValue };
		}

		return {};
	}

	private static parseFilter(query: Record<string, unknown>, plan: IApiControllerGetListQueryPlan): IApiControllerGetListQueryAst {
		const groups: Record<string, IApiControllerGetListQueryRawGroup> = {};

		for (const [key, value] of Object.entries(query)) {
			const match: null | RegExpExecArray = /^(.+)\[(operator|value|values)\]$/u.exec(key);
			const [, rawPath, rawSuffix]: Array<string | undefined> = match ?? [];

			if (!rawPath || !rawSuffix || rawPath.includes("[") || rawPath.includes("]")) {
				throw new BadRequestException("FILTER_NOT_VALID");
			}

			const path: string = rawPath;
			const suffix: keyof IApiControllerGetListQueryRawGroup = rawSuffix as keyof IApiControllerGetListQueryRawGroup;
			const field: IApiControllerGetListQueryPlanFilterField | undefined = plan.filter.fields[path];

			if (!field?.isEnabled) {
				throw new BadRequestException("FILTER_NOT_VALID");
			}

			const group: IApiControllerGetListQueryRawGroup = (groups[path] ??= {});

			if (group[suffix] !== undefined) {
				throw new BadRequestException("FILTER_NOT_VALID");
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
		const operation: unknown = group.operator;

		if (!EnumIsValue(EFilterOperation, operation)) {
			throw new BadRequestException("FILTER_NOT_VALID");
		}

		if (!field.allowedOperations.includes(operation)) {
			throw new BadRequestException("FILTER_NOT_VALID");
		}

		const descriptor: IApiControllerGetListQueryOperator = FILTER_OPERATOR_REGISTRY_CONSTANT.OPERATORS[operation];

		if (!descriptor.kinds.includes(field.type) || (descriptor.operand === EFilterOperand.NONE && !field.isNullable)) {
			throw new BadRequestException("FILTER_NOT_VALID");
		}

		if (descriptor.operand === EFilterOperand.NONE) {
			if (group.value !== undefined || group.values !== undefined) {
				throw new BadRequestException("FILTER_NOT_VALID");
			}

			return Object.freeze({ operation, path: field.path });
		}

		if (descriptor.operand === EFilterOperand.VALUE) {
			if (group.value === undefined || Array.isArray(group.value) || group.values !== undefined) {
				throw new BadRequestException("FILTER_NOT_VALID");
			}

			return Object.freeze({
				operation,
				path: field.path,
				value: this.parseValue(group.value, field),
			});
		}

		if (group.value !== undefined || group.values === undefined) {
			throw new BadRequestException("FILTER_NOT_VALID");
		}

		const rawValues: ReadonlyArray<unknown> = Array.isArray(group.values) ? group.values : [group.values];

		if (rawValues.length < FILTER_OPERATOR_REGISTRY_CONSTANT.VALUES_MINIMUM_OPERAND_COUNT || (descriptor.operand === EFilterOperand.PAIR && rawValues.length !== FILTER_OPERATOR_REGISTRY_CONSTANT.PAIR_OPERAND_COUNT) || (descriptor.operand === EFilterOperand.VALUES && rawValues.length > DTO_GENERATE_CONSTANT.MAXIMUM_FILTER_PROPERTIES)) {
			throw new BadRequestException("FILTER_NOT_VALID");
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
			throw new BadRequestException("ORDER_NOT_VALID");
		}

		if (!EnumIsValue(EFilterOrderDirection, orderDirectionValue)) {
			throw new BadRequestException("ORDER_NOT_VALID");
		}

		if (!plan.order.fields[orderByValue]?.isEnabled || plan.order.resolvePublishedFields?.().has(orderByValue) === false) {
			throw new BadRequestException("ORDER_NOT_VALID");
		}

		return {
			orderBy: orderByValue,
			orderDirection: orderDirectionValue,
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
			throw new BadRequestException(`${name.toUpperCase()}_NOT_VALID`);
		}

		return parsed;
	}

	private static parseValue(value: unknown, field: IApiControllerGetListQueryPlanFilterField): unknown {
		return ApiControllerGetListQueryParseValue(value, field.metadata);
	}
}
