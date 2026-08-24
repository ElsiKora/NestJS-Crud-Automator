import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerGetListQueryAst, IApiControllerGetListQueryAstNode, IApiControllerGetListQueryPlanOrderEntry } from "@interface/class/api/controller/get-list/query";
import type { IApiGetListCursorResponseResult } from "@interface/decorator/api";
import type { TApiAuthorizationScopeWhere } from "@type/class/api/authorization/scope-where.type";
import type { TApiControllerGetListQueryCompiledOrderField } from "@type/class/api/controller/get-list/compiled/order-field.type";
import type { TApiControllerGetListQueryCompiledPlan } from "@type/class/api/controller/get-list/compiled/plan.type";
import type { TApiControllerGetListCursorExecutionOptions } from "@type/class/api/controller/get-list/cursor/execution-options.type";
import type { TApiFunctionGetManyProperties } from "@type/decorator/api/function";
import type { FindOptionsOrder, FindOptionsWhere } from "typeorm";

import { createHash } from "node:crypto";

import { ApiControllerGeneratedGetManyContract } from "@class/api/controller/generated/get-many-contract.class";
import { ApiControllerGeneratedSecuritySnapshot } from "@class/api/controller/generated/security-snapshot.class";
import { API_CONTROLLER_CURSOR_TOKEN_MAX_LENGTH } from "@constant/api-controller-cursor.constant";
import { EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType } from "@enum/decorator/api";
import { EFilterOrderDirection } from "@enum/filter";
import { BadRequestException } from "@nestjs/common";
import { ApiControllerGetListQueryEnumValues } from "@utility/api/controller/get-list/query/enum-values.utility";
import { AuthorizationScopeMergeWhere } from "@utility/authorization/scope-merge-where.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { Equal, LessThan, MoreThan } from "typeorm";

const CURSOR_CONTEXT_HASH_PATTERN: RegExp = /^[\da-f]{64}$/u;
const CURSOR_TOKEN_PATTERN: RegExp = /^[\w-]+$/u;
const CURSOR_VERSION: number = 1;
const BIGINT_WIRE_PATTERN: RegExp = /^(?:0|-?[1-9]\d*)$/u;
const UUID_WIRE_PATTERN: RegExp = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/u;

export class ApiControllerGetListCursorRuntime {
	public static assertItemsInvariant(items: ReadonlyArray<IApiBaseEntity>, fields: ReadonlyArray<string>, signature: string): void {
		if (this.createItemsInvariantSignature(items, fields) !== signature) {
			throw ErrorException("CURSOR GET_LIST function subscriber changed the protected result window");
		}
	}

	public static assertResponseInvariant(response: unknown, fields: ReadonlyArray<string>, signature: string): void {
		if (this.createResponseInvariantSignature(response, fields) !== signature) {
			throw ErrorException("CURSOR GET_LIST response pipeline changed the protected pagination result");
		}
	}

	public static createContextHash(route: string, parameters: Partial<IApiBaseEntity> | undefined, plan: TApiControllerGetListQueryCompiledPlan<EApiControllerGetListQueryPaginationMode.CURSOR>, ast: IApiControllerGetListQueryAst, order: ReadonlyArray<IApiControllerGetListQueryPlanOrderEntry>, readPlanSignature?: string): string {
		const normalizedParameters: Record<string, unknown> = {};

		for (const [key, value] of Object.entries(parameters ?? {}).toSorted(([left]: [string, unknown], [right]: [string, unknown]): number => this.compareStrings(left, right))) {
			normalizedParameters[key] = value;
		}

		const filters: Array<Record<string, unknown>> = ast.nodes.map((node: IApiControllerGetListQueryAstNode): Record<string, unknown> => ({
			operation: node.operation,
			path: node.path,
			...(node.value === undefined ? {} : { value: node.value }),
			...(node.values === undefined ? {} : { values: node.values }),
		}));

		const context: object = {
			filters,
			order,
			parameters: normalizedParameters,
			plan: {
				controller: plan.controllerName,
				schema: plan.schemaName,
				signature: plan.signature,
			},
			...(readPlanSignature === undefined ? {} : { readPlan: readPlanSignature }),
			route,
		};

		return createHash("sha256").update(this.canonicalStringify(context)).digest("hex");
	}

	public static createItemsInvariantSignature(items: ReadonlyArray<IApiBaseEntity>, fields: ReadonlyArray<string>): string {
		try {
			if (fields.length === 0) {
				throw new TypeError("Missing order fields");
			}

			return this.canonicalStringify(
				items.map((item: IApiBaseEntity): ReadonlyArray<unknown> => {
					if (!item || typeof item !== "object" || Array.isArray(item)) {
						throw new TypeError("Invalid cursor item");
					}

					return fields.map((field: string): unknown => this.readProtectedItemValue(item, field));
				}),
			);
		} catch {
			throw ErrorException("CURSOR GET_LIST result does not expose its protected raw order tuple");
		}
	}

	public static createResponseInvariantSignature(response: unknown, fields: ReadonlyArray<string>): string {
		if (!response || typeof response !== "object" || Array.isArray(response)) {
			throw ErrorException("CURSOR GET_LIST response must keep the flat pagination envelope");
		}

		const envelope: Record<string, unknown> = response as Record<string, unknown>;
		const keys: Array<string> = Object.keys(envelope).toSorted((left: string, right: string): number => this.compareStrings(left, right));

		if (keys.join(",") !== "items,nextCursor,previousCursor" || !Array.isArray(envelope.items) || (envelope.nextCursor !== null && typeof envelope.nextCursor !== "string") || (envelope.previousCursor !== null && typeof envelope.previousCursor !== "string")) {
			throw ErrorException("CURSOR GET_LIST response must keep the flat pagination envelope");
		}

		return this.canonicalStringify({
			items: this.createItemsInvariantSignature(envelope.items as Array<IApiBaseEntity>, fields),
			nextCursor: envelope.nextCursor,
			previousCursor: envelope.previousCursor,
		});
	}

	public static async execute<E extends IApiBaseEntity>(options: TApiControllerGetListCursorExecutionOptions<E>): Promise<IApiGetListCursorResponseResult<E>> {
		return await ApiControllerGeneratedGetManyContract.run(options.baseProperties, async (): Promise<IApiGetListCursorResponseResult<E>> => await this.executeWithinContract(options));
	}

	public static isolateItems<E extends IApiBaseEntity>(items: ReadonlyArray<E>, fields: ReadonlyArray<string>): Array<E> {
		try {
			return items.map((item: E): E => {
				const clone: E = Object.create(Object.getPrototypeOf(item) as null | object) as E;

				for (const key of Reflect.ownKeys(item)) {
					const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(item, key);

					if (descriptor) {
						Object.defineProperty(clone, key, descriptor);
					}
				}

				for (const field of fields) {
					const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(item, field);

					if (!descriptor?.enumerable || !("value" in descriptor)) {
						throw new TypeError("Invalid protected cursor field");
					}
				}

				return clone;
			});
		} catch {
			throw ErrorException("CURSOR GET_LIST result does not expose its protected raw order tuple");
		}
	}

	private static canonicalize(value: unknown): unknown {
		if (value instanceof Date) {
			if (Number.isNaN(value.getTime())) {
				throw ErrorException("Cursor context contains an invalid date");
			}

			return value.toISOString();
		}

		if (value === null || typeof value === "boolean" || typeof value === "string") {
			return value;
		}

		if (typeof value === "number") {
			if (!Number.isFinite(value)) {
				throw ErrorException("Cursor context contains a non-finite number");
			}

			return Object.is(value, -0) ? 0 : value;
		}

		if (Array.isArray(value)) {
			return value.map((item: unknown): unknown => this.canonicalize(item));
		}

		if (value && typeof value === "object") {
			const result: Record<string, unknown> = {};

			for (const [key, item] of Object.entries(value as Record<string, unknown>).toSorted(([left]: [string, unknown], [right]: [string, unknown]): number => this.compareStrings(left, right))) {
				if (item !== undefined) {
					result[key] = this.canonicalize(item);
				}
			}

			return result;
		}

		throw ErrorException("Cursor context contains an unsupported value");
	}

	private static canonicalStringify(value: unknown): string {
		return JSON.stringify(this.canonicalize(value));
	}

	private static compareStrings(left: string, right: string): number {
		if (left < right) {
			return -1;
		}

		return left > right ? 1 : 0;
	}

	private static createWindowWhere<E extends IApiBaseEntity>(order: ReadonlyArray<IApiControllerGetListQueryPlanOrderEntry>, values: ReadonlyArray<unknown>, direction: "after" | "before"): Array<FindOptionsWhere<E>> {
		if (order.length === 0 || order.length !== values.length) {
			throw new BadRequestException("INVALID_CURSOR");
		}

		return order.map((entry: IApiControllerGetListQueryPlanOrderEntry, index: number): FindOptionsWhere<E> => {
			const branch: Record<string, unknown> = {};

			for (let prefixIndex: number = 0; prefixIndex < index; prefixIndex++) {
				const prefixEntry: IApiControllerGetListQueryPlanOrderEntry | undefined = order[prefixIndex];

				if (prefixEntry) {
					branch[prefixEntry.field] = Equal(values[prefixIndex]);
				}
			}

			const isAscendingAfter: boolean = entry.direction === EFilterOrderDirection.ASC && direction === "after";
			const isDescendingBefore: boolean = entry.direction === EFilterOrderDirection.DESC && direction === "before";

			const boundaryValue: unknown = values[index];

			branch[entry.field] = isAscendingAfter || isDescendingBefore ? MoreThan(boundaryValue) : LessThan(boundaryValue);

			return branch as FindOptionsWhere<E>;
		});
	}

	private static decode(cursor: string, contextHash: string, plan: TApiControllerGetListQueryCompiledPlan<EApiControllerGetListQueryPaginationMode.CURSOR>, order: ReadonlyArray<IApiControllerGetListQueryPlanOrderEntry>, validateStorageValue: TApiControllerGetListCursorExecutionOptions<IApiBaseEntity>["validateStorageValue"]): ReadonlyArray<unknown> {
		try {
			if (cursor.length > API_CONTROLLER_CURSOR_TOKEN_MAX_LENGTH || !CURSOR_TOKEN_PATTERN.test(cursor) || !CURSOR_CONTEXT_HASH_PATTERN.test(contextHash)) {
				throw new Error("Invalid cursor envelope");
			}

			const json: string = Buffer.from(cursor, "base64url").toString("utf8");
			const rawPayload: unknown = JSON.parse(json);

			if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) {
				throw new Error("Invalid cursor payload");
			}

			const payload: Record<string, unknown> = rawPayload as Record<string, unknown>;
			const keys: Array<string> = Object.keys(payload).toSorted((left: string, right: string): number => this.compareStrings(left, right));

			if (keys.join(",") !== "c,v,values" || payload.v !== CURSOR_VERSION || payload.c !== contextHash || !Array.isArray(payload.values) || payload.values.length !== order.length) {
				throw new Error("Invalid cursor payload");
			}

			const values: ReadonlyArray<unknown> = Object.freeze(
				payload.values.map((value: unknown, index: number): unknown => {
					const field: TApiControllerGetListQueryCompiledOrderField = this.getOrderField(plan, order[index]);
					const decodedValue: unknown = this.decodeValue(value, field);

					validateStorageValue(field, decodedValue);

					return decodedValue;
				}),
			);
			// Cursor wire order is intentionally fixed as v, c, values.
			// eslint-disable-next-line @elsikora/perfectionist/sort-objects
			const canonicalJson: string = JSON.stringify({ v: CURSOR_VERSION, c: contextHash, values });
			const canonicalCursor: string = Buffer.from(canonicalJson, "utf8").toString("base64url");

			if (canonicalCursor !== cursor) {
				throw new Error("Non-canonical cursor");
			}

			return values;
		} catch {
			throw new BadRequestException("INVALID_CURSOR");
		}
	}

	private static decodeValue(value: unknown, field: TApiControllerGetListQueryCompiledOrderField): unknown {
		if (field.type === EApiPropertyDescribeType.BOOLEAN && typeof value === "boolean") {
			return value;
		}

		if (field.type === EApiPropertyDescribeType.ENUM) {
			const enumValues: ReadonlyArray<number | string> = ApiControllerGetListQueryEnumValues("enum" in field.metadata ? field.metadata.enum : {});

			if (enumValues.length > 0 && enumValues.every((item: number | string): boolean => typeof item === "number" && Number.isSafeInteger(item)) && typeof value === "number" && Number.isSafeInteger(value)) {
				return value;
			}
		}

		if (field.type === EApiPropertyDescribeType.NUMBER && "format" in field.metadata && field.metadata.format === EApiPropertyNumberType.INTEGER && typeof value === "number" && Number.isSafeInteger(value)) {
			return Object.is(value, -0) ? 0 : value;
		}

		if (field.type === EApiPropertyDescribeType.STRING && "format" in field.metadata && field.metadata.format === EApiPropertyStringType.BIGINT_STRING && typeof value === "string" && BIGINT_WIRE_PATTERN.test(value)) {
			return value;
		}

		if (field.type === EApiPropertyDescribeType.UUID && typeof value === "string" && UUID_WIRE_PATTERN.test(value)) {
			return value;
		}

		throw new BadRequestException("INVALID_CURSOR");
	}

	private static encode(item: IApiBaseEntity, contextHash: string, plan: TApiControllerGetListQueryCompiledPlan<EApiControllerGetListQueryPaginationMode.CURSOR>, order: ReadonlyArray<IApiControllerGetListQueryPlanOrderEntry>, validateStorageValue: TApiControllerGetListCursorExecutionOptions<IApiBaseEntity>["validateStorageValue"]): string {
		const values: ReadonlyArray<unknown> = this.extractValues(item, plan, order, validateStorageValue);
		// Cursor wire order is intentionally fixed as v, c, values.
		// eslint-disable-next-line @elsikora/perfectionist/sort-objects
		const json: string = JSON.stringify({ v: CURSOR_VERSION, c: contextHash, values });

		const cursor: string = Buffer.from(json, "utf8").toString("base64url");

		if (cursor.length > API_CONTROLLER_CURSOR_TOKEN_MAX_LENGTH) {
			throw ErrorException("CURSOR GET_LIST generated token exceeds its proven storage bound");
		}

		return cursor;
	}

	private static async executeWithinContract<E extends IApiBaseEntity>(options: TApiControllerGetListCursorExecutionOptions<E>): Promise<IApiGetListCursorResponseResult<E>> {
		const cursorValues: ReadonlyArray<unknown> | undefined = options.cursor ? this.decode(options.cursor, options.contextHash, options.plan, options.order, options.validateStorageValue) : undefined;
		const baseWhere: TApiAuthorizationScopeWhere<E> = AuthorizationScopeMergeWhere(undefined, ApiControllerGeneratedSecuritySnapshot.detach(options.baseProperties.where));
		const mainScopeWhere: TApiAuthorizationScopeWhere<E> = ApiControllerGeneratedSecuritySnapshot.detach(baseWhere);
		const mainWindowWhere: TApiAuthorizationScopeWhere<E> | undefined = cursorValues && options.direction ? this.createWindowWhere<E>(options.order, cursorValues, options.direction) : undefined;
		const mainWhere: TApiAuthorizationScopeWhere<E> = mainWindowWhere ? AuthorizationScopeMergeWhere(mainScopeWhere, mainWindowWhere) : mainScopeWhere;
		const mainOrder: ReadonlyArray<IApiControllerGetListQueryPlanOrderEntry> = options.direction === "before" ? this.reverseOrder(options.order) : options.order;

		const mainProperties: TApiFunctionGetManyProperties<E> = {
			...options.baseProperties,
			order: this.toTypeOrmOrder<E>(mainOrder),
			take: options.limit + 1,
			where: mainWhere,
		};

		options.onBeforeQuery();
		const rawItems: Array<E> = await ApiControllerGeneratedGetManyContract.runWindow(mainWindowWhere, (): Promise<Array<E>> => options.run(mainProperties));
		const protectedOrderFields: Array<string> = options.order.map((entry: IApiControllerGetListQueryPlanOrderEntry): string => entry.field);
		const protectedItemsSignature: string = this.createItemsInvariantSignature(rawItems, protectedOrderFields);
		const isolatedItems: Array<E> = this.isolateItems(rawItems, protectedOrderFields);
		const hasOverflow: boolean = isolatedItems.length > options.limit;
		const windowItems: Array<E> = isolatedItems.slice(0, options.limit);
		const items: Array<E> = options.direction === "before" ? windowItems.toReversed() : windowItems;
		const firstItem: E | undefined = items[0];
		const lastItem: E | undefined = items.at(-1);

		if (!options.cursor || !options.direction) {
			return {
				items,
				nextCursor: hasOverflow && lastItem ? this.encode(lastItem, options.contextHash, options.plan, options.order, options.validateStorageValue) : null,
				previousCursor: null,
			};
		}

		if (!cursorValues) {
			throw new BadRequestException("INVALID_CURSOR");
		}

		const probeDirection: "after" | "before" = options.direction === "after" ? "before" : "after";
		let probeValues: ReadonlyArray<unknown> = cursorValues;

		if (options.direction === "after" && firstItem) {
			probeValues = this.extractValues(firstItem, options.plan, options.order, options.validateStorageValue);
		} else if (options.direction === "before" && lastItem) {
			probeValues = this.extractValues(lastItem, options.plan, options.order, options.validateStorageValue);
		}

		const probeWindowWhere: TApiAuthorizationScopeWhere<E> = this.createWindowWhere<E>(options.order, probeValues, probeDirection);
		const probeWhere: TApiAuthorizationScopeWhere<E> = AuthorizationScopeMergeWhere(ApiControllerGeneratedSecuritySnapshot.detach(baseWhere), probeWindowWhere);
		const probeOrder: ReadonlyArray<IApiControllerGetListQueryPlanOrderEntry> = probeDirection === "before" ? this.reverseOrder(options.order) : options.order;

		const probeItems: Array<E> = await ApiControllerGeneratedGetManyContract.runWindow(probeWindowWhere, (): Promise<Array<E>> =>
			options.run({
				order: this.toTypeOrmOrder<E>(probeOrder),
				take: 1,
				where: probeWhere,
			}),
		);

		this.assertItemsInvariant(rawItems, protectedOrderFields, protectedItemsSignature);
		const hasOppositeWindow: boolean = probeItems.length > 0;
		const encodedFirstCursor: null | string = firstItem ? this.encode(firstItem, options.contextHash, options.plan, options.order, options.validateStorageValue) : null;
		const encodedLastCursor: null | string = lastItem ? this.encode(lastItem, options.contextHash, options.plan, options.order, options.validateStorageValue) : null;

		if (options.direction === "after") {
			return {
				items,
				nextCursor: hasOverflow ? encodedLastCursor : null,
				previousCursor: hasOppositeWindow ? (encodedFirstCursor ?? options.cursor) : null,
			};
		}

		return {
			items,
			nextCursor: hasOppositeWindow ? (encodedLastCursor ?? options.cursor) : null,
			previousCursor: hasOverflow ? encodedFirstCursor : null,
		};
	}

	private static extractValues(item: IApiBaseEntity, plan: TApiControllerGetListQueryCompiledPlan<EApiControllerGetListQueryPaginationMode.CURSOR>, order: ReadonlyArray<IApiControllerGetListQueryPlanOrderEntry>, validateStorageValue: TApiControllerGetListCursorExecutionOptions<IApiBaseEntity>["validateStorageValue"]): ReadonlyArray<unknown> {
		try {
			return Object.freeze(
				order.map((entry: IApiControllerGetListQueryPlanOrderEntry): unknown => {
					const field: TApiControllerGetListQueryCompiledOrderField = this.getOrderField(plan, entry);
					const value: unknown = this.decodeValue(item[entry.field], field);

					validateStorageValue(field, value);

					return value;
				}),
			);
		} catch {
			throw ErrorException("CURSOR GET_LIST result does not expose a valid protected raw order tuple");
		}
	}

	private static getOrderField(plan: TApiControllerGetListQueryCompiledPlan<EApiControllerGetListQueryPaginationMode.CURSOR>, entry: IApiControllerGetListQueryPlanOrderEntry | undefined): TApiControllerGetListQueryCompiledOrderField {
		const field: TApiControllerGetListQueryCompiledOrderField | undefined = entry ? plan.order.serverFields[entry.field] : undefined;

		if (!field) {
			throw new BadRequestException("INVALID_CURSOR");
		}

		return field;
	}

	private static readProtectedItemValue(item: IApiBaseEntity, field: string): unknown {
		const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(item, field);

		if (!descriptor?.enumerable || !("value" in descriptor)) {
			throw new TypeError("Invalid protected cursor field");
		}

		return descriptor.value;
	}

	private static reverseOrder(order: ReadonlyArray<IApiControllerGetListQueryPlanOrderEntry>): ReadonlyArray<IApiControllerGetListQueryPlanOrderEntry> {
		return order.map((entry: IApiControllerGetListQueryPlanOrderEntry): IApiControllerGetListQueryPlanOrderEntry => ({
			direction: entry.direction === EFilterOrderDirection.ASC ? EFilterOrderDirection.DESC : EFilterOrderDirection.ASC,
			field: entry.field,
		}));
	}

	private static toTypeOrmOrder<E>(order: ReadonlyArray<IApiControllerGetListQueryPlanOrderEntry>): FindOptionsOrder<E> {
		return Object.fromEntries(order.map((entry: IApiControllerGetListQueryPlanOrderEntry): [string, EFilterOrderDirection] => [entry.field, entry.direction])) as FindOptionsOrder<E>;
	}
}
