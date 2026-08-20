import type { EntitySubscriberInterface } from "typeorm";
import type { TApiControllerGetListQueryCompiledOrderField } from "@type/class/api/controller/get-list/compiled/order-field.type";
import type { TApiControllerGetListQueryCompiledPlan } from "@type/class/api/controller/get-list/compiled/plan.type";
import type { Repository } from "typeorm";

import { ApiControllerGetListCursorDataSourceContract } from "@class/api/controller/get-list/cursor/data-source-contract.class";
import { EApiControllerGetListQueryPaginationMode, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType } from "@enum/decorator/api";
import { EFilterOrderDirection } from "@enum/filter";
import { CursorQueryEntity } from "@test/unit/class/api/controller/get-list/query/fixture/cursor.entity";
import { DataSource } from "typeorm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

function createBigintStringPlan(): TApiControllerGetListQueryCompiledPlan<EApiControllerGetListQueryPaginationMode.CURSOR> {
	const field: TApiControllerGetListQueryCompiledOrderField = {
		columnMode: "regular",
		columnType: "bigint",
		hasTransformer: false,
		isColumnArray: false,
		isEnabled: true,
		isNullable: false,
		isSelected: true,
		isUnsigned: false,
		metadata: { description: "generation", exampleValue: "1", format: EApiPropertyStringType.BIGINT_STRING, maxLength: 20, minLength: 1, pattern: "/^(?:0|-?[1-9]\\d*)$/", type: EApiPropertyDescribeType.STRING },
		path: "generation",
		type: EApiPropertyDescribeType.STRING,
	};

	return createStoragePlan(field);
}

function createPostgresTextParser(oid: number): (value: string) => unknown {
	if (oid === 16) {
		return (value: string): boolean => value === "t";
	}

	if (oid === 20 || oid === 1043 || oid === 2950) {
		return (value: string): string => value;
	}

	if (oid === 21 || oid === 23) {
		return (value: string): number => Number(value);
	}

	return (value: string): string => value;
}

function createDriverRepository(type: string, field: TApiControllerGetListQueryCompiledOrderField, driver: object = {}, extra?: object): Repository<CursorQueryEntity> {
	const declaredType: unknown = field.columnType === "boolean-constructor" ? Boolean : field.columnType === "date-constructor" ? Date : field.columnType === "number-constructor" ? Number : field.columnType === "string-constructor" ? String : field.columnType;
	const columnMetadata = {
		isArray: field.isColumnArray,
		isNullable: field.isNullable,
		isSelect: field.isSelected,
		isVirtual: false,
		isVirtualProperty: false,
		length: "",
		precision: field.precision,
		propertyPath: field.path,
		scale: field.scale,
		transformer: field.hasTransformer ? {} : undefined,
		type: declaredType,
		unsigned: field.isUnsigned,
	};

	return {
		manager: {
			connection: {
				driver: {
					normalizeType: (column: { type?: unknown }): string => String(column.type ?? ""),
					...(type === "postgres" ? { postgres: { types: { getTypeParser: createPostgresTextParser } } } : {}),
					...driver,
				},
				options: { ...(extra === undefined ? {} : { extra }), type },
				subscribers: [],
			},
		},
		metadata: {
			afterLoadListeners: [],
			columns: [columnMetadata],
			primaryColumns: [columnMetadata],
			target: CursorQueryEntity,
		},
	} as unknown as Repository<CursorQueryEntity>;
}

function createStoragePlan(field: TApiControllerGetListQueryCompiledOrderField): TApiControllerGetListQueryCompiledPlan<EApiControllerGetListQueryPaginationMode.CURSOR> {
	const fieldName: string = field.path;

	return {
		controllerName: "StorageCursorController",
		filter: { fields: {}, isLegacy: false },
		order: {
			defaultOrder: [],
			fields: { [fieldName]: field },
			isLegacy: false,
			serverFields: { [fieldName]: field },
			tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: fieldName }],
		},
		pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR },
		schemaName: "StorageCursorQueryDTO",
		signature: "storage-cursor-signature",
	};
}

describe("ApiControllerGetListCursorDataSourceContract", () => {
	let dataSource: DataSource;

	afterEach(async () => {
		if (dataSource.isInitialized) {
			await dataSource.destroy();
		}
	});

	beforeEach(async () => {
		dataSource = new DataSource({ database: ":memory:", entities: [CursorQueryEntity], synchronize: true, type: "sqlite" });
		await dataSource.initialize();
	});

	it("rejects global and entity-applicable afterLoad subscribers before a cursor query", () => {
		const repository = dataSource.getRepository(CursorQueryEntity);
		const globalSubscriber: EntitySubscriberInterface<CursorQueryEntity> = { afterLoad: () => undefined };

		dataSource.subscribers.push(globalSubscriber);
		expect(() => ApiControllerGetListCursorDataSourceContract.assertSafe(repository)).toThrow("applicable TypeORM afterLoad subscriber");

		dataSource.subscribers.length = 0;
		dataSource.subscribers.push({ afterLoad: () => undefined, listenTo: () => CursorQueryEntity });
		expect(() => ApiControllerGetListCursorDataSourceContract.assertSafe(repository)).toThrow("applicable TypeORM afterLoad subscriber");
	});

	it("allows an afterLoad subscriber that explicitly targets another entity", () => {
		dataSource.subscribers.push({ afterLoad: () => undefined, listenTo: () => String });

		expect(() => ApiControllerGetListCursorDataSourceContract.assertSafe(dataSource.getRepository(CursorQueryEntity))).not.toThrow();
	});

	it("requires the active driver to preserve BIGINT_STRING values without Number conversion", () => {
		const plan = createBigintStringPlan();
		const field = plan.order.serverFields.generation;

		if (!field) {
			throw new Error("Expected a bigint-string order field");
		}

		const postgresRepository = createDriverRepository("postgres", field, {
			postgres: {
				types: {
					getTypeParser:
						() =>
						(value: string): string =>
							value,
				},
			},
		});

		expect(() => ApiControllerGetListCursorDataSourceContract.assertSafe(postgresRepository, plan)).not.toThrow();

		const lossyOverride = createDriverRepository(
			"postgres",
			field,
			{
				postgres: {
					types: {
						getTypeParser:
							() =>
							(value: string): string =>
								value,
					},
				},
			},
			{
				types: {
					getTypeParser:
						() =>
						(value: string): number =>
							Number(value),
				},
			},
		);

		expect(() => ApiControllerGetListCursorDataSourceContract.assertSafe(lossyOverride, plan)).toThrow("custom PostgreSQL result parsers");

		const lossyGlobalParser = createDriverRepository("postgres", field, {
			postgres: {
				types: {
					getTypeParser:
						() =>
						(value: string): string =>
							String(Number(value)),
				},
			},
		});

		expect(() => ApiControllerGetListCursorDataSourceContract.assertSafe(lossyGlobalParser, plan)).toThrow("text result parser is incompatible");

		const exactBinaryOverride = createDriverRepository(
			"postgres",
			field,
			{},
			{
				binary: true,
				types: {
					getTypeParser:
						() =>
						(value: Buffer): string =>
							value.readBigInt64BE().toString(),
				},
			},
		);

		expect(() => ApiControllerGetListCursorDataSourceContract.assertSafe(exactBinaryOverride, plan)).toThrow("PostgreSQL text result parsers");

		const defaultBinaryRepository = createDriverRepository(
			"postgres",
			field,
			{
				postgres: {
					defaults: { binary: true },
					types: {
						getTypeParser:
							() =>
							(value: string): string =>
								value,
					},
				},
			},
			{ binary: false },
		);

		expect(() => ApiControllerGetListCursorDataSourceContract.assertSafe(defaultBinaryRepository, plan)).toThrow("PostgreSQL text result parsers");
	});

	it("validates opaque numeric boundaries against the active storage domain rather than DTO bounds", () => {
		const field: TApiControllerGetListQueryCompiledOrderField = {
			columnMode: "regular",
			columnType: "int",
			hasTransformer: false,
			isColumnArray: false,
			isEnabled: true,
			isNullable: false,
			isSelected: true,
			isUnsigned: false,
			metadata: { description: "rank", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 10, minimum: 0, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER },
			path: "rank",
			type: EApiPropertyDescribeType.NUMBER,
		};
		const repository = createDriverRepository("postgres", field, { normalizeType: (): string => "integer" });
		const validator = ApiControllerGetListCursorDataSourceContract.createValueValidator(repository, createStoragePlan(field));

		expect(() => validator(field, 101)).not.toThrow();
		expect(() => validator(field, 2_147_483_648)).toThrow("active database storage range");
	});

	it("rejects native enums whose schema-dynamic PostgreSQL OID cannot be proven synchronously", () => {
		const field: TApiControllerGetListQueryCompiledOrderField = {
			columnMode: "regular",
			columnType: "enum",
			hasTransformer: false,
			isColumnArray: false,
			isEnabled: true,
			isNullable: false,
			isSelected: true,
			isUnsigned: false,
			metadata: { description: "state", enum: { ACTIVE: "ACTIVE", CLOSED: "CLOSED" }, enumName: "State", type: EApiPropertyDescribeType.ENUM },
			path: "state",
			type: EApiPropertyDescribeType.ENUM,
		};
		const repository = createDriverRepository("postgres", field, { normalizeType: (): string => "enum" });
		expect(() => ApiControllerGetListCursorDataSourceContract.createValueValidator(repository, createStoragePlan(field))).toThrow("not supported by PostgreSQL CURSOR v1");
	});

	it.each([
		["generic string", { metadata: { description: "name", exampleValue: "cursor", format: EApiPropertyStringType.STRING, maxLength: 100, minLength: 1, pattern: "/.+/", type: EApiPropertyDescribeType.STRING }, type: EApiPropertyDescribeType.STRING }],
		["string enum", { metadata: { description: "state", enum: { ACTIVE: "ACTIVE" }, enumName: "State", type: EApiPropertyDescribeType.ENUM }, type: EApiPropertyDescribeType.ENUM }],
	] as const)("rejects PostgreSQL varchar-backed %s fields outside the v1 matrix", (_label, properties) => {
		const field: TApiControllerGetListQueryCompiledOrderField = {
			columnMode: "regular",
			columnType: "varchar",
			hasTransformer: false,
			isColumnArray: false,
			isEnabled: true,
			isNullable: false,
			isSelected: true,
			isUnsigned: false,
			path: "name",
			...properties,
		};
		const repository = createDriverRepository("postgres", field, { normalizeType: (): string => "character varying" });

		expect(() => ApiControllerGetListCursorDataSourceContract.assertSafe(repository, createStoragePlan(field))).toThrow("not supported by PostgreSQL CURSOR v1");
	});

	it("probes adjacent canonical PostgreSQL UUID values", () => {
		const field: TApiControllerGetListQueryCompiledOrderField = {
			columnMode: "regular",
			columnType: "uuid",
			hasTransformer: false,
			isColumnArray: false,
			isEnabled: true,
			isNullable: false,
			isSelected: true,
			isUnsigned: false,
			metadata: { description: "id", type: EApiPropertyDescribeType.UUID },
			path: "id",
			type: EApiPropertyDescribeType.UUID,
		};
		const repository = createDriverRepository("postgres", field, {
			postgres: {
				types: {
					getTypeParser:
						() =>
						(value: string): string =>
							value.endsWith("2") ? `${value.slice(0, -1)}1` : value,
				},
			},
		});

		expect(() => ApiControllerGetListCursorDataSourceContract.assertSafe(repository, createStoragePlan(field))).toThrow("text result parser is incompatible");
	});

	it.each([
		["boolean", { columnType: "boolean", metadata: { description: "active", type: EApiPropertyDescribeType.BOOLEAN }, path: "active", type: EApiPropertyDescribeType.BOOLEAN }],
		["int4", { columnType: "int", metadata: { description: "rank", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 10, minimum: 0, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER }, path: "rank", type: EApiPropertyDescribeType.NUMBER }],
		["uuid", { columnType: "uuid", metadata: { description: "id", type: EApiPropertyDescribeType.UUID }, path: "id", type: EApiPropertyDescribeType.UUID }],
	] as const)("rejects an obviously incompatible process-global PostgreSQL %s parser", (_label, properties) => {
		const field: TApiControllerGetListQueryCompiledOrderField = {
			columnMode: "regular",
			hasTransformer: false,
			isColumnArray: false,
			isEnabled: true,
			isNullable: false,
			isSelected: true,
			isUnsigned: false,
			...properties,
		};
		const repository = createDriverRepository("postgres", field, {
			normalizeType: (): string => (field.columnType === "int" ? "integer" : field.columnType),
			postgres: { types: { getTypeParser: (): ((value: string) => number) => () => 0 } },
		});

		expect(() => ApiControllerGetListCursorDataSourceContract.assertSafe(repository, createStoragePlan(field))).toThrow("text result parser is incompatible");
	});

	it("checks token capacity per effective order alternative rather than summing mutually exclusive fields", () => {
		const identifierField: TApiControllerGetListQueryCompiledOrderField = {
			columnMode: "regular",
			columnType: "uuid",
			hasTransformer: false,
			isColumnArray: false,
			isEnabled: false,
			isNullable: false,
			isSelected: true,
			isUnsigned: false,
			metadata: { description: "id", type: EApiPropertyDescribeType.UUID },
			path: "id",
			type: EApiPropertyDescribeType.UUID,
		};
		const repository = createDriverRepository("postgres", identifierField);
		const serverFields: Record<string, TApiControllerGetListQueryCompiledOrderField> = { id: identifierField };
		const enabledFields: Record<string, TApiControllerGetListQueryCompiledOrderField> = {};
		const activeColumns: Array<Record<string, unknown>> = [];

		for (let index: number = 0; index < 256; index += 1) {
			const fieldName: string = `alternative${index}`;
			const field: TApiControllerGetListQueryCompiledOrderField = {
				columnMode: "regular",
				columnType: "uuid",
				hasTransformer: false,
				isColumnArray: false,
				isEnabled: true,
				isNullable: false,
				isSelected: true,
				isUnsigned: false,
				metadata: { description: fieldName, type: EApiPropertyDescribeType.UUID },
				path: fieldName,
				type: EApiPropertyDescribeType.UUID,
			};

			serverFields[fieldName] = field;
			enabledFields[fieldName] = field;
			activeColumns.push({ isArray: false, isNullable: false, isSelect: true, isVirtual: false, isVirtualProperty: false, length: "", precision: undefined, propertyPath: fieldName, scale: undefined, transformer: undefined, type: "uuid", unsigned: false });
		}

		repository.metadata.columns.push(...(activeColumns as unknown as typeof repository.metadata.columns));
		const plan: TApiControllerGetListQueryCompiledPlan<EApiControllerGetListQueryPaginationMode.CURSOR> = {
			controllerName: "AlternativeStorageCursorController",
			filter: { fields: {}, isLegacy: false },
			order: {
				defaultOrder: [{ direction: EFilterOrderDirection.ASC, field: "alternative0" }],
				fields: enabledFields,
				isLegacy: false,
				serverFields,
				tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }],
			},
			pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR },
			schemaName: "AlternativeStorageCursorQueryDTO",
			signature: "alternative-storage-cursor-signature",
		};

		expect(() => ApiControllerGetListCursorDataSourceContract.createValueValidator(repository, plan)).not.toThrow();
	});

	it.each([
		[
			"BOOLEAN",
			{
				columnMode: "regular",
				columnType: "boolean",
				hasTransformer: false,
				isColumnArray: false,
				isEnabled: true,
				isNullable: false,
				isSelected: true,
				isUnsigned: false,
				metadata: { description: "active", type: EApiPropertyDescribeType.BOOLEAN },
				path: "active",
				type: EApiPropertyDescribeType.BOOLEAN,
			},
		],
		[
			"Number constructor",
			{
				columnMode: "regular",
				columnType: "number-constructor",
				hasTransformer: false,
				isColumnArray: false,
				isEnabled: true,
				isNullable: false,
				isSelected: true,
				isUnsigned: false,
				metadata: { description: "rank", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 10, minimum: 0, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER },
				path: "rank",
				type: EApiPropertyDescribeType.NUMBER,
			},
		],
		[
			"FLOAT",
			{
				columnMode: "regular",
				columnType: "double",
				hasTransformer: false,
				isColumnArray: false,
				isEnabled: true,
				isNullable: false,
				isSelected: true,
				isUnsigned: false,
				metadata: { description: "score", exampleValue: 0.1, format: EApiPropertyNumberType.DOUBLE, maximum: 10, minimum: 0, multipleOf: 0.1, type: EApiPropertyDescribeType.NUMBER },
				path: "score",
				type: EApiPropertyDescribeType.NUMBER,
			},
		],
		[
			"DATETIME",
			{
				columnMode: "regular",
				columnType: "datetime",
				hasTransformer: false,
				isColumnArray: false,
				isEnabled: true,
				isNullable: false,
				isSelected: true,
				isUnsigned: false,
				metadata: { format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE },
				path: "releasedAt",
				precision: 3,
				type: EApiPropertyDescribeType.DATE,
			},
		],
	] as const)("rejects %s storage when the active SQLite driver cannot prove exact keyset values", (_label, field) => {
		const repository = createDriverRepository("sqlite", field, dataSource.driver);

		expect(() => ApiControllerGetListCursorDataSourceContract.assertSafe(repository, createStoragePlan(field))).toThrow("CURSOR GET_LIST");
	});
});
