import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerGetListQueryPlanOrderEntry } from "@interface/class/api/controller/get-list/query";
import type { TApiControllerGetListQueryCompiledOrderField } from "@type/class/api/controller/get-list/compiled/order-field.type";
import type { TApiControllerGetListQueryCompiledPlan } from "@type/class/api/controller/get-list/compiled/plan.type";
import type { EntitySubscriberInterface, EntityTarget, Repository } from "typeorm";
import type { ColumnMetadata } from "typeorm/metadata/ColumnMetadata";

import { API_CONTROLLER_CURSOR_TOKEN_MAX_LENGTH } from "@constant/api-controller-cursor.constant";
import { EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType } from "@enum/decorator/api";
import { ApiControllerGetListQueryEnumValues } from "@utility/api/controller/get-list/query/enum-values.utility";
import { ApiControllerGetListQueryResolveCursorOrderFields } from "@utility/api/controller/get-list/query/resolve-cursor-order-fields.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { ObjectFindPropertyDescriptor } from "@utility/object-find-property-descriptor.utility";

const POSTGRES_BOOLEAN_OID: number = 16;
const POSTGRES_BIGINT_OID: number = 20;
const POSTGRES_SMALLINT_OID: number = 21;
const POSTGRES_INTEGER_OID: number = 23;
const POSTGRES_UUID_OID: number = 2950;
const POSTGRES_BIGINT_PROBE: string = "9007199254740992";
const SIGNED_BIGINT_MAXIMUM: bigint = 9_223_372_036_854_775_807n;
const SIGNED_BIGINT_MINIMUM: bigint = -9_223_372_036_854_775_808n;
const BASE64_INPUT_GROUP_SIZE: number = 3;
const BASE64_OUTPUT_GROUP_SIZE: number = 4;
const BOOLEAN_JSON_MAXIMUM_BYTES: number = 5;
const JSON_STRING_QUOTES_BYTES: number = 2;
const NUMBER_JSON_MAXIMUM_BYTES: number = 25;
const SIGNED_BIGINT_JSON_MAXIMUM_BYTES: number = 22;
const CURSOR_CONTEXT_HASH_LENGTH: number = 64;
const BINARY_RADIX: number = 2;
const SIGNED_WIDTH_OFFSET: number = 1;
const UUID_TEXT_LENGTH: number = 36;
const UUID_VALUE_PATTERN: RegExp = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/u;
const INTEGER_BITS_16: number = 16;
const INTEGER_BITS_32: number = 32;
const SIGNED_SMALLINT_MINIMUM: number = -32_768;
const SIGNED_SMALLINT_MAXIMUM: number = 32_767;
const SIGNED_INTEGER_MINIMUM: number = -2_147_483_648;
const SIGNED_INTEGER_MAXIMUM: number = 2_147_483_647;

const INTEGER_STORAGE_BITS: Readonly<Record<string, number>> = Object.freeze({
	"postgres:integer": INTEGER_BITS_32,
	"postgres:smallint": INTEGER_BITS_16,
});

const EXACT_STORAGE_TYPES_BY_DRIVER: Readonly<Record<string, Readonly<Record<string, ReadonlySet<string>>>>> = Object.freeze({
	postgres: Object.freeze({
		BIGINT_STRING: new Set<string>(["bigint"]),
		BOOLEAN: new Set<string>(["boolean"]),
		ENUM_NUMBER: new Set<string>(["integer", "smallint"]),
		INTEGER: new Set<string>(["integer", "smallint"]),
		UUID: new Set<string>(["uuid"]),
	}),
});

/**
 * Proves that the active repository uses an exact database/storage/hydration
 * contract for every protected cursor tuple field.
 */
export class ApiControllerGetListCursorDataSourceContract {
	public static assertSafe<E extends IApiBaseEntity>(repository: Repository<E>, plan?: TApiControllerGetListQueryCompiledPlan): void {
		if (plan) {
			this.assertStorageSafe(repository, plan);
		}

		const target: EntityTarget<E> = repository.metadata.target;

		if (repository.metadata.afterLoadListeners.length > 0) {
			throw ErrorException("CURSOR GET_LIST entity cannot use a TypeORM afterLoad listener");
		}

		for (const subscriber of repository.manager.connection.subscribers) {
			if (this.hasAfterLoad(subscriber) && this.isApplicable(subscriber, target)) {
				throw ErrorException("CURSOR GET_LIST entity cannot use an applicable TypeORM afterLoad subscriber");
			}
		}
	}

	public static createValueValidator<E extends IApiBaseEntity>(repository: Repository<E>, plan: TApiControllerGetListQueryCompiledPlan): (field: TApiControllerGetListQueryCompiledOrderField, value: unknown) => void {
		this.assertSafe(repository, plan);
		const driverType: string | undefined = this.getDriverType(repository);

		if (!driverType) {
			throw ErrorException("CURSOR GET_LIST requires a supported exact active database storage contract");
		}

		const contracts: ReadonlyArray<Readonly<{ field: TApiControllerGetListQueryCompiledOrderField; normalizedStorageType: string; storageContract: string }>> = Object.freeze(
			this.getOrderFields(plan).map((field: TApiControllerGetListQueryCompiledOrderField): Readonly<{ field: TApiControllerGetListQueryCompiledOrderField; normalizedStorageType: string; storageContract: string }> => {
				const column: ColumnMetadata | undefined = repository.metadata.columns.find((candidate: ColumnMetadata): boolean => candidate.propertyPath === field.path);

				if (!column) {
					throw ErrorException(`CURSOR GET_LIST active repository is missing order field "${field.path}"`);
				}

				return Object.freeze({
					field,
					normalizedStorageType: this.normalizeActiveStorageType(repository, column),
					storageContract: this.getStorageContract(field),
				});
			}),
		);

		return Object.freeze((field: TApiControllerGetListQueryCompiledOrderField, value: unknown): void => {
			const contract: Readonly<{ field: TApiControllerGetListQueryCompiledOrderField; normalizedStorageType: string; storageContract: string }> | undefined = contracts.find((candidate: Readonly<{ field: TApiControllerGetListQueryCompiledOrderField; normalizedStorageType: string; storageContract: string }>): boolean => candidate.field === field && candidate.field.path === field.path);

			if (!contract) {
				throw ErrorException("CURSOR GET_LIST storage validator received an unknown order field");
			}

			this.assertStorageValueSafe(driverType, contract.normalizedStorageType, contract.storageContract, contract.field, value);
		});
	}

	private static assertActiveColumnMatches(field: TApiControllerGetListQueryCompiledOrderField, column: ColumnMetadata): void {
		const columnType: string = this.normalizeDeclaredColumnType(column.type);
		const columnPrecision: null | number | undefined = column.precision ?? undefined;
		const fieldPrecision: null | number | undefined = field.precision ?? undefined;

		if (column.propertyPath !== field.path || columnType !== field.columnType || columnPrecision !== fieldPrecision || column.scale !== field.scale || column.isArray !== field.isColumnArray || column.isNullable !== field.isNullable || column.isSelect !== field.isSelected || column.unsigned !== field.isUnsigned || Boolean(column.transformer) !== field.hasTransformer) {
			throw ErrorException(`CURSOR GET_LIST active column metadata for "${field.path}" differs from the compiled cursor plan`);
		}

		if (column.isArray || column.isNullable || !column.isSelect || column.transformer || column.isVirtual || column.isVirtualProperty) {
			throw ErrorException(`CURSOR GET_LIST active order field "${field.path}" is not an exact selected persisted scalar`);
		}
	}

	private static assertExactPostgresTextParser<E extends IApiBaseEntity>(repository: Repository<E>, storageContract: string, normalizedStorageType: string): void {
		const connection: Repository<E>["manager"]["connection"] = repository.manager.connection;
		const driver: unknown = connection.driver;
		const postgres: unknown = driver && typeof driver === "object" && "postgres" in driver ? driver.postgres : undefined;
		const driverTypes: unknown = postgres && typeof postgres === "object" && "types" in postgres ? postgres.types : undefined;
		const getTypeParser: unknown = driverTypes && typeof driverTypes === "object" && "getTypeParser" in driverTypes ? driverTypes.getTypeParser : undefined;

		if (typeof getTypeParser !== "function") {
			throw ErrorException("CURSOR GET_LIST active PostgreSQL driver cannot prove its text result parsers");
		}

		let oid: number;
		let probes: ReadonlyArray<Readonly<[string, unknown]>>;

		if (storageContract === "BOOLEAN" && normalizedStorageType === "boolean") {
			oid = POSTGRES_BOOLEAN_OID;
			probes = Object.freeze([this.createPostgresParserProbe("t", true), this.createPostgresParserProbe("f", false)]);
		} else if ((storageContract === "INTEGER" || storageContract === "ENUM_NUMBER") && normalizedStorageType === "smallint") {
			oid = POSTGRES_SMALLINT_OID;
			probes = Object.freeze([this.createPostgresParserProbe(SIGNED_SMALLINT_MINIMUM.toString(), SIGNED_SMALLINT_MINIMUM), this.createPostgresParserProbe("-1", -1), this.createPostgresParserProbe("0", 0), this.createPostgresParserProbe("1", 1), this.createPostgresParserProbe(SIGNED_SMALLINT_MAXIMUM.toString(), SIGNED_SMALLINT_MAXIMUM)]);
		} else if ((storageContract === "INTEGER" || storageContract === "ENUM_NUMBER") && normalizedStorageType === "integer") {
			oid = POSTGRES_INTEGER_OID;
			probes = Object.freeze([this.createPostgresParserProbe(SIGNED_INTEGER_MINIMUM.toString(), SIGNED_INTEGER_MINIMUM), this.createPostgresParserProbe("-1", -1), this.createPostgresParserProbe("0", 0), this.createPostgresParserProbe("1", 1), this.createPostgresParserProbe(SIGNED_INTEGER_MAXIMUM.toString(), SIGNED_INTEGER_MAXIMUM)]);
		} else if (storageContract === "BIGINT_STRING" && normalizedStorageType === "bigint") {
			oid = POSTGRES_BIGINT_OID;
			probes = Object.freeze([SIGNED_BIGINT_MINIMUM.toString(), "-9007199254740993", "-9007199254740992", POSTGRES_BIGINT_PROBE, "9007199254740993", SIGNED_BIGINT_MAXIMUM.toString()].map((probe: string): Readonly<[string, unknown]> => this.createPostgresParserProbe(probe, probe)));
		} else if (storageContract === "UUID" && normalizedStorageType === "uuid") {
			oid = POSTGRES_UUID_OID;
			probes = Object.freeze(["00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000002", "ffffffff-ffff-ffff-ffff-ffffffffffff"].map((probe: string): Readonly<[string, unknown]> => this.createPostgresParserProbe(probe, probe)));
		} else {
			throw ErrorException("CURSOR GET_LIST active PostgreSQL storage has no proven text result parser");
		}

		try {
			const parser: unknown = Reflect.apply(getTypeParser, driverTypes, [oid, "text"]);

			if (typeof parser !== "function" || !probes.every(([input, expected]: Readonly<[string, unknown]>): boolean => Object.is(Reflect.apply(parser, undefined, [input]), expected))) {
				throw ErrorException("CURSOR GET_LIST active PostgreSQL text result parser is incompatible with an order field");
			}
		} catch {
			throw ErrorException("CURSOR GET_LIST active PostgreSQL text result parser is incompatible with an order field");
		}
	}

	private static assertIntegerStorageValue(driverType: string, normalizedStorageType: string, field: TApiControllerGetListQueryCompiledOrderField, value: unknown): void {
		const storageKey: string = `${driverType}:${normalizedStorageType}`;
		const bits: number | undefined = INTEGER_STORAGE_BITS[storageKey];

		if (!bits || typeof value !== "number" || !Number.isSafeInteger(value)) {
			throw ErrorException(`CURSOR GET_LIST integer order field "${field.path}" has an invalid active storage value`);
		}

		const databaseMinimum: number = -(BINARY_RADIX ** (bits - SIGNED_WIDTH_OFFSET));
		const databaseMaximum: number = BINARY_RADIX ** (bits - SIGNED_WIDTH_OFFSET) - SIGNED_WIDTH_OFFSET;

		if (value < databaseMinimum || value > databaseMaximum) {
			throw ErrorException(`CURSOR GET_LIST integer order field "${field.path}" exceeds its active database storage range`);
		}
	}

	private static assertPrimaryTieBreaker<E extends IApiBaseEntity>(repository: Repository<E>, plan: TApiControllerGetListQueryCompiledPlan): void {
		const primaryColumns: ReadonlyArray<ColumnMetadata> = repository.metadata.primaryColumns;
		const finalTieBreaker: string | undefined = plan.order.tieBreakers?.at(-1)?.field;

		if (primaryColumns.length !== 1 || !finalTieBreaker || primaryColumns[0]?.propertyPath !== finalTieBreaker) {
			throw ErrorException("CURSOR GET_LIST active repository must use the final order field as its sole primary key");
		}
	}

	private static assertStorageSafe<E extends IApiBaseEntity>(repository: Repository<E>, plan: TApiControllerGetListQueryCompiledPlan): void {
		const driverType: string | undefined = this.getDriverType(repository);
		const fields: ReadonlyArray<TApiControllerGetListQueryCompiledOrderField> = this.getOrderFields(plan);
		const driverStorage: Readonly<Record<string, ReadonlySet<string>>> | undefined = driverType ? EXACT_STORAGE_TYPES_BY_DRIVER[driverType] : undefined;

		if (!driverType || !driverStorage) {
			throw ErrorException("CURSOR GET_LIST requires a supported exact active database storage contract");
		}

		if (driverType === "postgres" && this.isPostgresBinaryMode(repository)) {
			throw ErrorException("CURSOR GET_LIST requires PostgreSQL text result parsers for exact cursor values");
		}

		if (driverType === "postgres" && this.hasCustomPostgresTypes(repository)) {
			throw ErrorException("CURSOR GET_LIST cannot prove custom PostgreSQL result parsers");
		}

		this.assertPrimaryTieBreaker(repository, plan);
		const checkedParserContracts: Set<string> = new Set<string>();

		for (const field of fields) {
			const column: ColumnMetadata | undefined = repository.metadata.columns.find((candidate: ColumnMetadata): boolean => candidate.propertyPath === field.path);

			if (!column) {
				throw ErrorException(`CURSOR GET_LIST active repository is missing order field "${field.path}"`);
			}

			this.assertActiveColumnMatches(field, column);

			const storageContract: string = this.getStorageContract(field);
			const normalizedStorageType: string = this.normalizeActiveStorageType(repository, column);

			if (!driverStorage[storageContract]?.has(normalizedStorageType)) {
				throw ErrorException(`CURSOR GET_LIST order field "${field.path}" has no proven exact active database representation`);
			}

			if (field.isUnsigned) {
				throw ErrorException(`CURSOR GET_LIST order field "${field.path}" cannot use unsigned metadata with active PostgreSQL storage`);
			}

			const parserContract: string = `${storageContract}:${normalizedStorageType}`;

			if (!checkedParserContracts.has(parserContract)) {
				this.assertExactPostgresTextParser(repository, storageContract, normalizedStorageType);
				checkedParserContracts.add(parserContract);
			}
		}

		this.assertTokenCapacitySafe(plan);
	}

	private static assertStorageValueSafe(driverType: string, normalizedStorageType: string, storageContract: string, field: TApiControllerGetListQueryCompiledOrderField, value: unknown): void {
		if (storageContract === "BOOLEAN") {
			if (typeof value !== "boolean") {
				throw ErrorException(`CURSOR GET_LIST boolean order field "${field.path}" has an invalid active storage value`);
			}

			return;
		}

		if (storageContract === "INTEGER" || storageContract === "ENUM_NUMBER") {
			this.assertIntegerStorageValue(driverType, normalizedStorageType, field, value);

			return;
		}

		if (storageContract === "BIGINT_STRING") {
			if (typeof value !== "string" || !/^(?:0|-?[1-9]\d*)$/u.test(value)) {
				throw ErrorException(`CURSOR GET_LIST bigint-string order field "${field.path}" has an invalid active storage value`);
			}

			const bigintValue: bigint = BigInt(value);

			if (bigintValue < SIGNED_BIGINT_MINIMUM || bigintValue > SIGNED_BIGINT_MAXIMUM) {
				throw ErrorException(`CURSOR GET_LIST bigint-string order field "${field.path}" exceeds the active PostgreSQL bigint domain`);
			}

			return;
		}

		if (storageContract === "UUID") {
			if (typeof value !== "string" || !UUID_VALUE_PATTERN.test(value)) {
				throw ErrorException(`CURSOR GET_LIST UUID order field "${field.path}" has an invalid active storage value`);
			}

			return;
		}

		throw ErrorException(`CURSOR GET_LIST order field "${field.path}" has no active storage value contract`);
	}

	private static assertTokenCapacitySafe(plan: TApiControllerGetListQueryCompiledPlan): void {
		const emptyPayloadBytes: number = Buffer.byteLength(JSON.stringify({ c: "0".repeat(CURSOR_CONTEXT_HASH_LENGTH), v: 1, values: [] }), "utf8");

		for (const fields of this.getOrderFieldSequences(plan)) {
			let maximumPayloadBytes: number = emptyPayloadBytes + Math.max(0, fields.length - 1);

			for (const field of fields) {
				maximumPayloadBytes += this.getMaximumStorageJsonBytes(field);
			}

			if (Math.ceil((maximumPayloadBytes * BASE64_OUTPUT_GROUP_SIZE) / BASE64_INPUT_GROUP_SIZE) > API_CONTROLLER_CURSOR_TOKEN_MAX_LENGTH) {
				throw ErrorException("CURSOR GET_LIST active order tuple can exceed the maximum cursor token length");
			}
		}
	}

	private static createPostgresParserProbe(input: string, expected: unknown): Readonly<[string, unknown]> {
		return Object.freeze<[string, unknown]>([input, expected]);
	}

	private static getDriverType<E extends IApiBaseEntity>(repository: Repository<E>): string | undefined {
		const options: unknown = repository.manager.connection.options;
		const type: unknown = options && typeof options === "object" && "type" in options ? options.type : undefined;

		return typeof type === "string" ? type : undefined;
	}

	private static getMaximumStorageJsonBytes(field: TApiControllerGetListQueryCompiledOrderField): number {
		const storageContract: string = this.getStorageContract(field);

		if (storageContract === "BOOLEAN") {
			return BOOLEAN_JSON_MAXIMUM_BYTES;
		}

		if (storageContract === "INTEGER" || storageContract === "ENUM_NUMBER") {
			return NUMBER_JSON_MAXIMUM_BYTES;
		}

		if (storageContract === "BIGINT_STRING") {
			return SIGNED_BIGINT_JSON_MAXIMUM_BYTES;
		}

		if (storageContract === "UUID") {
			return UUID_TEXT_LENGTH + JSON_STRING_QUOTES_BYTES;
		}

		throw ErrorException(`CURSOR GET_LIST order field "${field.path}" has no bounded PostgreSQL CURSOR v1 storage contract`);
	}

	private static getOrderFields(plan: TApiControllerGetListQueryCompiledPlan): ReadonlyArray<TApiControllerGetListQueryCompiledOrderField> {
		return ApiControllerGetListQueryResolveCursorOrderFields(plan.order).map((fieldName: string): TApiControllerGetListQueryCompiledOrderField => {
			const field: TApiControllerGetListQueryCompiledOrderField | undefined = plan.order.serverFields[fieldName];

			if (!field) {
				throw ErrorException("CURSOR GET_LIST compiled order field is missing");
			}

			return field;
		});
	}

	private static getOrderFieldSequences(plan: TApiControllerGetListQueryCompiledPlan): ReadonlyArray<ReadonlyArray<TApiControllerGetListQueryCompiledOrderField>> {
		const tieBreakerFields: ReadonlyArray<string> = Object.freeze((plan.order.tieBreakers ?? []).map((entry: IApiControllerGetListQueryPlanOrderEntry): string => entry.field));
		const configuredSequences: Array<ReadonlyArray<string>> = [Object.freeze([...(plan.order.defaultOrder ?? []).map((entry: IApiControllerGetListQueryPlanOrderEntry): string => entry.field), ...tieBreakerFields])];

		for (const [fieldName, field] of Object.entries(plan.order.fields)) {
			if (field.isEnabled) {
				configuredSequences.push(Object.freeze([fieldName, ...tieBreakerFields]));
			}
		}

		return Object.freeze(
			configuredSequences.map((sequence: ReadonlyArray<string>): ReadonlyArray<TApiControllerGetListQueryCompiledOrderField> => {
				const seenFields: Set<string> = new Set<string>();
				const fields: Array<TApiControllerGetListQueryCompiledOrderField> = [];

				for (const fieldName of sequence) {
					if (seenFields.has(fieldName)) {
						continue;
					}

					const field: TApiControllerGetListQueryCompiledOrderField | undefined = plan.order.serverFields[fieldName];

					if (!field) {
						throw ErrorException("CURSOR GET_LIST compiled order field is missing");
					}

					seenFields.add(fieldName);
					fields.push(field);
				}

				return Object.freeze(fields);
			}),
		);
	}

	private static getStorageContract(field: TApiControllerGetListQueryCompiledOrderField): string {
		if (field.type === EApiPropertyDescribeType.BOOLEAN) {
			return "BOOLEAN";
		}

		if (field.type === EApiPropertyDescribeType.NUMBER) {
			if ("format" in field.metadata && field.metadata.format === EApiPropertyNumberType.INTEGER) {
				return "INTEGER";
			}

			throw ErrorException(`CURSOR GET_LIST numeric order field "${field.path}" is not supported by PostgreSQL CURSOR v1`);
		}

		if (field.type === EApiPropertyDescribeType.STRING) {
			if ("format" in field.metadata && field.metadata.format === EApiPropertyStringType.BIGINT_STRING) {
				return "BIGINT_STRING";
			}

			throw ErrorException(`CURSOR GET_LIST string order field "${field.path}" is not supported by PostgreSQL CURSOR v1`);
		}

		if (field.type === EApiPropertyDescribeType.ENUM) {
			const values: ReadonlyArray<number | string> = ApiControllerGetListQueryEnumValues("enum" in field.metadata ? field.metadata.enum : {});

			if (values.length > 0 && values.every((value: number | string): boolean => typeof value === "number" && Number.isSafeInteger(value))) {
				return "ENUM_NUMBER";
			}

			throw ErrorException(`CURSOR GET_LIST enum order field "${field.path}" is not supported by PostgreSQL CURSOR v1`);
		}

		if (field.type === EApiPropertyDescribeType.UUID) {
			return "UUID";
		}

		throw ErrorException(`CURSOR GET_LIST order field "${field.path}" is not supported by PostgreSQL CURSOR v1`);
	}

	private static hasAfterLoad(subscriber: EntitySubscriberInterface<unknown>): boolean {
		const descriptor: PropertyDescriptor | undefined = ObjectFindPropertyDescriptor(subscriber, "afterLoad");

		return Boolean(descriptor && (!("value" in descriptor) || typeof descriptor.value === "function"));
	}

	private static hasCustomPostgresTypes<E extends IApiBaseEntity>(repository: Repository<E>): boolean {
		const options: unknown = repository.manager.connection.options;
		const extra: unknown = options && typeof options === "object" && "extra" in options ? options.extra : undefined;

		return Boolean(extra && typeof extra === "object" && Object.hasOwn(extra, "types"));
	}

	private static isApplicable<E>(subscriber: EntitySubscriberInterface<unknown>, target: EntityTarget<E>): boolean {
		const descriptor: PropertyDescriptor | undefined = ObjectFindPropertyDescriptor(subscriber, "listenTo");

		if (!descriptor) {
			return true;
		}

		if (!("value" in descriptor) || typeof descriptor.value !== "function") {
			throw ErrorException("CURSOR GET_LIST TypeORM subscriber listenTo must be a data method");
		}

		const listenedTarget: unknown = Reflect.apply(descriptor.value as (...arguments_: Array<unknown>) => unknown, subscriber, []);

		if (!listenedTarget || listenedTarget === Object || listenedTarget === target) {
			return true;
		}

		return typeof listenedTarget === "function" && typeof target === "function" && this.isConstructorAncestor(listenedTarget, target);
	}

	private static isConstructorAncestor(ancestor: object, target: object): boolean {
		let current: null | object = Object.getPrototypeOf(target) as null | object;

		while (current) {
			if (current === ancestor) {
				return true;
			}

			current = Object.getPrototypeOf(current) as null | object;
		}

		return false;
	}

	private static isPostgresBinaryMode<E extends IApiBaseEntity>(repository: Repository<E>): boolean {
		const connection: Repository<E>["manager"]["connection"] = repository.manager.connection;
		const extra: unknown = connection.options && typeof connection.options === "object" && "extra" in connection.options ? connection.options.extra : undefined;
		const extraBinary: unknown = extra && typeof extra === "object" && "binary" in extra ? extra.binary : undefined;
		const driver: unknown = connection.driver;
		const postgres: unknown = driver && typeof driver === "object" && "postgres" in driver ? driver.postgres : undefined;
		const postgresDefaults: unknown = postgres && typeof postgres === "object" && "defaults" in postgres ? postgres.defaults : undefined;
		const defaultBinary: unknown = postgresDefaults && typeof postgresDefaults === "object" && "binary" in postgresDefaults ? postgresDefaults.binary : undefined;

		return Boolean(extraBinary) || Boolean(defaultBinary);
	}

	private static normalizeActiveStorageType<E extends IApiBaseEntity>(repository: Repository<E>, column: ColumnMetadata): string {
		const driver: unknown = repository.manager.connection.driver;
		const normalizeType: unknown = driver && typeof driver === "object" && "normalizeType" in driver ? driver.normalizeType : undefined;

		if (typeof normalizeType !== "function") {
			throw ErrorException("CURSOR GET_LIST active database driver cannot prove its storage type");
		}

		const normalized: unknown = Reflect.apply(normalizeType, driver, [column]);

		if (typeof normalized !== "string" || normalized.length === 0) {
			throw ErrorException("CURSOR GET_LIST active database driver returned an invalid storage type");
		}

		return normalized.trim().toLowerCase();
	}

	private static normalizeDeclaredColumnType(type: unknown): string {
		if (type === Boolean) {
			return "boolean-constructor";
		}

		if (type === Number) {
			return "number-constructor";
		}

		return typeof type === "string" ? type.trim().toLowerCase() : "unknown";
	}
}
