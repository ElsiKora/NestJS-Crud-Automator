import type { TApiAuthorizationScopeWhere } from "@type/class/api/authorization/scope-where.type";

import { AuthorizationScopeMergeWhere } from "@utility/authorization/scope-merge-where.utility";
import { DataSource, EntitySchema, Equal, IsNull, Like } from "typeorm";
import { describe, expect, it } from "vitest";

class ScopeEntity {
	public effectiveAt?: Date;
	public id?: string;
	public operator?: { id?: string };
	public operatorId?: string;
	public status?: string;
	public tags?: Array<string>;
	public tenantId?: string;
}

class ScopeOperatorCondition {
	public id: string | undefined;

	constructor(id?: string) {
		this.id = id;
	}
}

class ScopeInheritedOperatorShape {
	public get _type(): string {
		return "equal";
	}

	public get _value(): undefined {
		return undefined;
	}
}

const SCOPE_OPERATOR_SCHEMA: EntitySchema<ScopeOperatorCondition> = new EntitySchema<ScopeOperatorCondition>({
	columns: {
		id: { primary: true, type: String },
	},
	name: "AuthorizationScopeMergeWhereOperatorProbe",
	target: ScopeOperatorCondition,
});

const SCOPE_ENTITY_SCHEMA: EntitySchema<ScopeEntity> = new EntitySchema<ScopeEntity>({
	columns: {
		id: { primary: true, type: String },
		operatorId: { nullable: true, type: String },
		status: { nullable: true, type: String },
		tags: { nullable: true, type: "simple-array" },
		tenantId: { nullable: true, type: String },
	},
	name: "AuthorizationScopeMergeWhereProbe",
	relations: {
		operator: {
			joinColumn: { name: "operatorId" },
			nullable: true,
			target: (): typeof ScopeOperatorCondition => ScopeOperatorCondition,
			type: "many-to-one",
		},
	},
	target: ScopeEntity,
});

describe("AuthorizationScopeMergeWhere", () => {
	it("returns scoped filter when base is empty", () => {
		const scopedWhere = { tenantId: "t1" } as TApiAuthorizationScopeWhere<ScopeEntity>;
		const result = AuthorizationScopeMergeWhere(undefined as unknown as TApiAuthorizationScopeWhere<ScopeEntity>, scopedWhere) as Record<string, unknown>;

		expect(result.tenantId).toMatchObject({
			_type: "equal",
			_value: "t1",
		});
	});

	it("rejects an empty array in either operand before TypeORM can drop all predicates", () => {
		const ownerWhere = { tenantId: "t1" } as TApiAuthorizationScopeWhere<ScopeEntity>;

		expect(() => AuthorizationScopeMergeWhere([] as TApiAuthorizationScopeWhere<ScopeEntity>, ownerWhere)).toThrow("Authorization scope WHERE cannot be an empty array");
		expect(() => AuthorizationScopeMergeWhere(ownerWhere, [] as TApiAuthorizationScopeWhere<ScopeEntity>)).toThrow("Authorization scope WHERE cannot be an empty array");
	});

	it("rejects empty, ineffective, and malformed array branches", () => {
		const ownerWhere = { tenantId: "t1" } as TApiAuthorizationScopeWhere<ScopeEntity>;
		const sparseWhere: Array<{ id?: string }> = new Array<{ id?: string }>(1);

		expect(() => AuthorizationScopeMergeWhere(ownerWhere, [{}] as TApiAuthorizationScopeWhere<ScopeEntity>)).toThrow("Authorization scope WHERE array branches must be non-empty plain objects");
		expect(() => AuthorizationScopeMergeWhere(ownerWhere, [{ id: undefined }] as TApiAuthorizationScopeWhere<ScopeEntity>)).toThrow("Authorization scope WHERE array branches must be non-empty plain objects");
		expect(() => AuthorizationScopeMergeWhere(ownerWhere, [{ status: "active", tenantId: undefined }] as TApiAuthorizationScopeWhere<ScopeEntity>)).toThrow("Authorization scope WHERE array branches must be non-empty plain objects");
		expect(() => AuthorizationScopeMergeWhere(ownerWhere, [{ operator: {}, status: "active" }] as TApiAuthorizationScopeWhere<ScopeEntity>)).toThrow("Authorization scope WHERE array branches must be non-empty plain objects");
		expect(() => AuthorizationScopeMergeWhere(ownerWhere, [null] as unknown as TApiAuthorizationScopeWhere<ScopeEntity>)).toThrow("Authorization scope WHERE array branches must be non-empty plain objects");
		expect(() => AuthorizationScopeMergeWhere(ownerWhere, sparseWhere as TApiAuthorizationScopeWhere<ScopeEntity>)).toThrow("Authorization scope WHERE array branches must be non-empty plain objects");
	});

	it("keeps a scalar empty base valid for a queryless list while adding owner scope", () => {
		const result = AuthorizationScopeMergeWhere({} as TApiAuthorizationScopeWhere<ScopeEntity>, { tenantId: "t1" } as TApiAuthorizationScopeWhere<ScopeEntity>) as Record<string, unknown>;

		expect(result.tenantId).toMatchObject({
			_type: "equal",
			_value: "t1",
		});
	});

	it("rejects ineffective nested scalar and malformed non-array operands", () => {
		const ownerWhere = { tenantId: "t1" } as TApiAuthorizationScopeWhere<ScopeEntity>;

		expect(() => AuthorizationScopeMergeWhere(ownerWhere, { tenantId: undefined } as TApiAuthorizationScopeWhere<ScopeEntity>)).toThrow("Authorization scope WHERE object must contain an effective predicate");
		expect(() => AuthorizationScopeMergeWhere(ownerWhere, { status: "active", tenantId: undefined } as TApiAuthorizationScopeWhere<ScopeEntity>)).toThrow("Authorization scope WHERE object must contain an effective predicate");
		expect(() => AuthorizationScopeMergeWhere(ownerWhere, { status: "active", tenantId: null } as unknown as TApiAuthorizationScopeWhere<ScopeEntity>)).toThrow("Authorization scope WHERE object must contain an effective predicate");
		expect(() => AuthorizationScopeMergeWhere(ownerWhere, { operator: {}, status: "active" } as TApiAuthorizationScopeWhere<ScopeEntity>)).toThrow("Authorization scope WHERE object must contain an effective predicate");
		expect(() => AuthorizationScopeMergeWhere(ownerWhere, { operator: { id: undefined } } as TApiAuthorizationScopeWhere<ScopeEntity>)).toThrow("Authorization scope WHERE object must contain an effective predicate");
		expect(() => AuthorizationScopeMergeWhere(ownerWhere, { operator: { id: undefined }, status: "active" } as TApiAuthorizationScopeWhere<ScopeEntity>)).toThrow("Authorization scope WHERE object must contain an effective predicate");
		expect(() => AuthorizationScopeMergeWhere(ownerWhere, null as unknown as TApiAuthorizationScopeWhere<ScopeEntity>)).toThrow("Authorization scope WHERE must be undefined, a plain object, or an array of plain objects");
	});

	it("rejects ineffective class-instance and nested relation-array branches", () => {
		const ownerWhere = { tenantId: "t1" } as TApiAuthorizationScopeWhere<ScopeEntity>;
		const ineffectiveInstance = { operator: new ScopeOperatorCondition(), status: "active" } as unknown as TApiAuthorizationScopeWhere<ScopeEntity>;
		const inheritedOperatorLookalike = { operator: new ScopeInheritedOperatorShape(), status: "active" } as unknown as TApiAuthorizationScopeWhere<ScopeEntity>;
		const ineffectiveRelationArray = { operator: [{ id: undefined }], status: "active" } as unknown as TApiAuthorizationScopeWhere<ScopeEntity>;
		const partiallyIneffectiveRelationArray = { operator: [{ id: undefined }, { id: "operator-1" }], status: "active" } as unknown as TApiAuthorizationScopeWhere<ScopeEntity>;
		const sparseRelationArray: Array<{ id?: string }> = new Array<{ id?: string }>(2);
		sparseRelationArray[1] = { id: "operator-1" };
		const sparseRelationWhere = { operator: sparseRelationArray, status: "active" } as unknown as TApiAuthorizationScopeWhere<ScopeEntity>;

		expect(() => AuthorizationScopeMergeWhere(ownerWhere, ineffectiveInstance)).toThrow("Authorization scope WHERE object must contain an effective predicate");
		expect(() => AuthorizationScopeMergeWhere(ownerWhere, inheritedOperatorLookalike)).toThrow("Authorization scope WHERE object must contain an effective predicate");
		expect(() => AuthorizationScopeMergeWhere(ownerWhere, ineffectiveRelationArray)).toThrow("Authorization scope WHERE object must contain an effective predicate");
		expect(() => AuthorizationScopeMergeWhere(ownerWhere, partiallyIneffectiveRelationArray)).toThrow("Authorization scope WHERE object must contain an effective predicate");
		expect(() => AuthorizationScopeMergeWhere(ownerWhere, sparseRelationWhere)).toThrow("Authorization scope WHERE object must contain an effective predicate");
	});

	it("normalizes effective relation branches and scalar arrays to exact equality", () => {
		const instanceWhere = { operator: new ScopeOperatorCondition("operator-1") } as unknown as TApiAuthorizationScopeWhere<ScopeEntity>;
		const relationArrayWhere = { operator: [{ id: "operator-1" }, { id: "operator-2" }] } as unknown as TApiAuthorizationScopeWhere<ScopeEntity>;
		const scalarArrayWhere = { tags: ["one", "two"] } as unknown as TApiAuthorizationScopeWhere<ScopeEntity>;
		const emptyArrayWhere = { operator: [] } as unknown as TApiAuthorizationScopeWhere<ScopeEntity>;
		const instanceResult = AuthorizationScopeMergeWhere({} as TApiAuthorizationScopeWhere<ScopeEntity>, instanceWhere) as { operator?: { id?: unknown } };
		const relationArrayResult = AuthorizationScopeMergeWhere({} as TApiAuthorizationScopeWhere<ScopeEntity>, relationArrayWhere) as { operator?: Array<{ id?: unknown }> };
		const scalarArrayResult = AuthorizationScopeMergeWhere({} as TApiAuthorizationScopeWhere<ScopeEntity>, scalarArrayWhere) as Record<string, unknown>;
		const emptyArrayResult = AuthorizationScopeMergeWhere({} as TApiAuthorizationScopeWhere<ScopeEntity>, emptyArrayWhere) as Record<string, unknown>;

		expect(instanceResult.operator?.id).toMatchObject({ _type: "equal", _value: "operator-1" });
		expect(relationArrayResult.operator?.[0]?.id).toMatchObject({ _type: "equal", _value: "operator-1" });
		expect(relationArrayResult.operator?.[1]?.id).toMatchObject({ _type: "equal", _value: "operator-2" });
		expect(scalarArrayResult.tags).toMatchObject({ _type: "equal", _value: ["one", "two"] });
		expect(emptyArrayResult.operator).toMatchObject({ _type: "equal", _value: [] });
	});

	it("keeps explicit FindOperator values atomic for null, arrays, and object-valued scalars", () => {
		const result = AuthorizationScopeMergeWhere({} as TApiAuthorizationScopeWhere<ScopeEntity>, { tenantId: IsNull() } as TApiAuthorizationScopeWhere<ScopeEntity>) as Record<string, unknown>;
		const emptyArrayResult = AuthorizationScopeMergeWhere({} as TApiAuthorizationScopeWhere<ScopeEntity>, { tags: Equal([]) } as unknown as TApiAuthorizationScopeWhere<ScopeEntity>) as Record<string, unknown>;
		const objectScalarResult = AuthorizationScopeMergeWhere({} as TApiAuthorizationScopeWhere<ScopeEntity>, { metadata: Equal({ segment: "vip" }) } as unknown as TApiAuthorizationScopeWhere<ScopeEntity>) as Record<string, unknown>;

		expect(result.tenantId).toMatchObject({
			_type: "isNull",
			_value: undefined,
		});
		expect(emptyArrayResult.tags).toMatchObject({
			_type: "equal",
			_value: [],
		});
		expect(objectScalarResult.metadata).toMatchObject({
			_type: "equal",
			_value: { segment: "vip" },
		});
	});

	it("rejects prototype-sensitive own predicate keys instead of dropping scope", () => {
		const hostileWhere = JSON.parse('{"__proto__":{"tenantId":"foreign"}}') as TApiAuthorizationScopeWhere<ScopeEntity>;

		expect(() => AuthorizationScopeMergeWhere({} as TApiAuthorizationScopeWhere<ScopeEntity>, hostileWhere)).toThrow('Authorization scope WHERE property "__proto__" is not a safe property name');
	});

	it("rejects hidden, symbol, and accessor predicates without invoking accessors", () => {
		const hiddenPartial = { status: "active" } as Record<string, unknown>;
		const hiddenOnly: Record<string, unknown> = {};
		const symbolWhere = { status: "active", [Symbol("tenantId")]: "t1" } as Record<PropertyKey, unknown>;
		const accessorWhere = { status: "active" } as Record<string, unknown>;
		const accessorRelationArray: Array<{ id?: string }> = [{ id: "operator-1" }];
		let accessorCalls: number = 0;

		Object.defineProperty(hiddenPartial, "tenantId", { value: "t1" });
		Object.defineProperty(hiddenOnly, "tenantId", { value: "t1" });
		Object.defineProperty(accessorWhere, "tenantId", {
			enumerable: true,
			get: (): string => {
				accessorCalls++;

				return "t1";
			},
		});
		Object.defineProperty(accessorRelationArray, "0", {
			enumerable: true,
			get: (): { id: string } => {
				accessorCalls++;

				return { id: "operator-1" };
			},
		});

		for (const malformedWhere of [hiddenPartial, hiddenOnly, symbolWhere, accessorWhere, { operator: accessorRelationArray, status: "active" }]) {
			expect(() => AuthorizationScopeMergeWhere({} as TApiAuthorizationScopeWhere<ScopeEntity>, malformedWhere as TApiAuthorizationScopeWhere<ScopeEntity>)).toThrow("Authorization scope WHERE object must contain an effective predicate");
		}

		expect(accessorCalls).toBe(0);
	});

	it("documents that TypeORM emits no WHERE for an empty array", async () => {
		const dataSource: DataSource = new DataSource({
			database: ":memory:",
			entities: [SCOPE_ENTITY_SCHEMA, SCOPE_OPERATOR_SCHEMA],
			type: "sqlite",
		});

		await dataSource.initialize();

		try {
			const sql: string = dataSource.getRepository(ScopeEntity).createQueryBuilder("scope").setFindOptions({ where: [] }).getSql();

			expect(sql).not.toContain(" WHERE ");
		} finally {
			await dataSource.destroy();
		}
	});

	it("documents that TypeORM drops an undefined property from a partially effective WHERE branch", async () => {
		const dataSource: DataSource = new DataSource({
			database: ":memory:",
			entities: [SCOPE_ENTITY_SCHEMA, SCOPE_OPERATOR_SCHEMA],
			type: "sqlite",
		});
		const partialWhere = { status: "active", tenantId: undefined } as TApiAuthorizationScopeWhere<ScopeEntity>;

		await dataSource.initialize();

		try {
			const sql: string = dataSource.getRepository(ScopeEntity).createQueryBuilder("scope").setFindOptions({ where: partialWhere }).getSql();
			const whereSql: string = sql.split(" WHERE ")[1] ?? "";

			expect(whereSql).toContain('"scope"."status"');
			expect(whereSql).not.toContain('"scope"."tenantId"');
			expect(() => AuthorizationScopeMergeWhere({} as TApiAuthorizationScopeWhere<ScopeEntity>, partialWhere)).toThrow("Authorization scope WHERE object must contain an effective predicate");
		} finally {
			await dataSource.destroy();
		}
	});

	it("documents that TypeORM drops hidden and symbol predicates", async () => {
		const dataSource: DataSource = new DataSource({
			database: ":memory:",
			entities: [SCOPE_ENTITY_SCHEMA, SCOPE_OPERATOR_SCHEMA],
			type: "sqlite",
		});
		const hiddenPartial = { status: "active" } as Record<string, unknown>;
		const hiddenOnly: Record<string, unknown> = {};
		const symbolWhere = { status: "active", [Symbol("tenantId")]: "t1" } as Record<PropertyKey, unknown>;

		Object.defineProperty(hiddenPartial, "tenantId", { value: "t1" });
		Object.defineProperty(hiddenOnly, "tenantId", { value: "t1" });
		await dataSource.initialize();

		try {
			const partialSql: string = dataSource.getRepository(ScopeEntity).createQueryBuilder("scope").setFindOptions({ where: hiddenPartial }).getSql();
			const hiddenOnlySql: string = dataSource.getRepository(ScopeEntity).createQueryBuilder("scope").setFindOptions({ where: hiddenOnly }).getSql();
			const symbolSql: string = dataSource.getRepository(ScopeEntity).createQueryBuilder("scope").setFindOptions({ where: symbolWhere }).getSql();
			const partialWhereSql: string = partialSql.split(" WHERE ")[1] ?? "";
			const symbolWhereSql: string = symbolSql.split(" WHERE ")[1] ?? "";

			expect(partialWhereSql).toContain('"scope"."status"');
			expect(partialWhereSql).not.toContain('"scope"."tenantId"');
			expect(hiddenOnlySql).not.toContain(" WHERE ");
			expect(symbolWhereSql).toContain('"scope"."status"');
			expect(symbolWhereSql).not.toContain('"scope"."tenantId"');
		} finally {
			await dataSource.destroy();
		}
	});

	it("documents that TypeORM drops an ineffective nested relation class instance", async () => {
		const dataSource: DataSource = new DataSource({
			database: ":memory:",
			entities: [SCOPE_ENTITY_SCHEMA, SCOPE_OPERATOR_SCHEMA],
			type: "sqlite",
		});
		const partialWhere = { operator: new ScopeOperatorCondition(), status: "active" } as unknown as TApiAuthorizationScopeWhere<ScopeEntity>;
		const inheritedOperatorLookalike = { operator: new ScopeInheritedOperatorShape(), status: "active" } as unknown as TApiAuthorizationScopeWhere<ScopeEntity>;

		await dataSource.initialize();

		try {
			const sql: string = dataSource.getRepository(ScopeEntity).createQueryBuilder("scope").setFindOptions({ where: partialWhere }).getSql();
			const lookalikeSql: string = dataSource.getRepository(ScopeEntity).createQueryBuilder("scope").setFindOptions({ where: inheritedOperatorLookalike }).getSql();
			const whereSql: string = sql.split(" WHERE ")[1] ?? "";
			const lookalikeWhereSql: string = lookalikeSql.split(" WHERE ")[1] ?? "";

			expect(whereSql).toContain('"scope"."status"');
			expect(whereSql).not.toContain('"scope__scope_operator"."id"');
			expect(lookalikeWhereSql).toContain('"scope"."status"');
			expect(lookalikeWhereSql).not.toContain('"scope__scope_operator"."id"');
			expect(() => AuthorizationScopeMergeWhere({} as TApiAuthorizationScopeWhere<ScopeEntity>, partialWhere)).toThrow("Authorization scope WHERE object must contain an effective predicate");
			expect(() => AuthorizationScopeMergeWhere({} as TApiAuthorizationScopeWhere<ScopeEntity>, inheritedOperatorLookalike)).toThrow("Authorization scope WHERE object must contain an effective predicate");
		} finally {
			await dataSource.destroy();
		}
	});

	it("normalizes direct relation scalars before TypeORM can discard their predicate", async () => {
		const dataSource: DataSource = new DataSource({
			database: ":memory:",
			entities: [SCOPE_ENTITY_SCHEMA, SCOPE_OPERATOR_SCHEMA],
			type: "sqlite",
		});
		const relationScalars: Array<unknown> = [1, "", new Date("2026-08-19T10:00:00.000Z"), Buffer.alloc(0), new Uint8Array()];

		await dataSource.initialize();

		try {
			for (const relationScalar of relationScalars) {
				const rawWhere = { operator: relationScalar, status: "active" } as unknown as TApiAuthorizationScopeWhere<ScopeEntity>;
				const rawSql: string = dataSource.getRepository(ScopeEntity).createQueryBuilder("scope").setFindOptions({ where: rawWhere }).getSql();
				const normalizedWhere = AuthorizationScopeMergeWhere({} as TApiAuthorizationScopeWhere<ScopeEntity>, rawWhere) as Record<string, unknown>;
				const normalizedSql: string = dataSource.getRepository(ScopeEntity).createQueryBuilder("scope").setFindOptions({ where: normalizedWhere }).getSql();

				expect(rawSql.split(" WHERE ")[1] ?? "").not.toContain('"scope"."operatorId"');
				expect(normalizedWhere.operator).toMatchObject({ _type: "equal", _value: relationScalar });
				expect(normalizedSql.split(" WHERE ")[1] ?? "").toContain('"scope"."operatorId"');
			}
		} finally {
			await dataSource.destroy();
		}
	});

	it("normalizes a scalar-array predicate to exact equality before TypeORM evaluates it", async () => {
		const dataSource: DataSource = new DataSource({
			database: ":memory:",
			entities: [SCOPE_ENTITY_SCHEMA, SCOPE_OPERATOR_SCHEMA],
			type: "sqlite",
		});
		const scalarArrayWhere = { tags: ["one", "two"] } as unknown as TApiAuthorizationScopeWhere<ScopeEntity>;

		await dataSource.initialize();

		try {
			const mergedWhere = AuthorizationScopeMergeWhere({} as TApiAuthorizationScopeWhere<ScopeEntity>, scalarArrayWhere);
			const sql: string = dataSource.getRepository(ScopeEntity).createQueryBuilder("scope").setFindOptions({ where: mergedWhere }).getSql();
			const tags = (mergedWhere as Record<string, unknown>).tags;

			expect(tags).toMatchObject({ _type: "equal", _value: ["one", "two"] });
			expect(sql).toContain(" WHERE ");
			expect(sql).toContain('"scope"."tags" = ?');
		} finally {
			await dataSource.destroy();
		}
	});

	it("merges arrays of filters into cartesian product", () => {
		const baseWhere = [{ id: "1" }, { id: "2" }] as TApiAuthorizationScopeWhere<ScopeEntity>;
		const scopedWhere = { status: "active" } as TApiAuthorizationScopeWhere<ScopeEntity>;

		const result = AuthorizationScopeMergeWhere(baseWhere, scopedWhere) as Array<Record<string, unknown>>;

		expect(result).toHaveLength(2);
		expect(result[0]?.id).toMatchObject({ _type: "equal", _value: "1" });
		expect(result[0]?.status).toMatchObject({ _type: "equal", _value: "active" });
		expect(result[1]?.id).toMatchObject({ _type: "equal", _value: "2" });
		expect(result[1]?.status).toMatchObject({ _type: "equal", _value: "active" });
	});

	it("keeps identical scalar filter semantics as exact equality", () => {
		const result = AuthorizationScopeMergeWhere({ id: "entity-1", operatorId: "operator-1" } as TApiAuthorizationScopeWhere<ScopeEntity>, { operatorId: "operator-1" } as TApiAuthorizationScopeWhere<ScopeEntity>) as Record<string, unknown>;

		expect(result.id).toMatchObject({ _type: "equal", _value: "entity-1" });
		expect(result.operatorId).toMatchObject({ _type: "equal", _value: "operator-1" });
	});

	it("keeps an identical Date scope and Equal as a database conjunction", () => {
		const effectiveAt: Date = new Date("2026-08-19T10:00:00.000Z");
		const result = AuthorizationScopeMergeWhere({ effectiveAt } as TApiAuthorizationScopeWhere<ScopeEntity>, { effectiveAt: Equal(new Date(effectiveAt)) } as TApiAuthorizationScopeWhere<ScopeEntity>) as Record<string, unknown>;

		expect(result.effectiveAt).toMatchObject({
			_type: "and",
			_value: [
				{ _type: "equal", _value: effectiveAt },
				{ _type: "equal", _value: new Date(effectiveAt) },
			],
		});
	});

	it("keeps conflicting Date and Equal operands as a database conjunction", () => {
		const result = AuthorizationScopeMergeWhere({ effectiveAt: new Date("2026-08-19T10:00:00.000Z") } as TApiAuthorizationScopeWhere<ScopeEntity>, { effectiveAt: Equal(new Date("2026-08-20T10:00:00.000Z")) } as TApiAuthorizationScopeWhere<ScopeEntity>) as Record<string, unknown>;

		expect(result.effectiveAt).toMatchObject({
			_type: "and",
			_value: [
				{ _type: "equal", _value: new Date("2026-08-19T10:00:00.000Z") },
				{ _type: "equal", _value: new Date("2026-08-20T10:00:00.000Z") },
			],
		});
	});

	it("retains scalar and LIKE operands for exact database evaluation", () => {
		const result = AuthorizationScopeMergeWhere({ tenantId: "foobar" } as TApiAuthorizationScopeWhere<ScopeEntity>, { tenantId: Like("%foo") } as TApiAuthorizationScopeWhere<ScopeEntity>) as Record<string, unknown>;

		expect(result.tenantId).toMatchObject({
			_type: "and",
			_value: [
				{ _type: "equal", _value: "foobar" },
				{ _type: "like", _value: "%foo" },
			],
		});
	});

	it("executes scalar plus LIKE as SQL AND instead of a relaxed scalar", async () => {
		const dataSource: DataSource = new DataSource({
			database: ":memory:",
			entities: [SCOPE_ENTITY_SCHEMA, SCOPE_OPERATOR_SCHEMA],
			synchronize: true,
			type: "sqlite",
		});

		await dataSource.initialize();

		try {
			const repository = dataSource.getRepository(ScopeEntity);
			const where = AuthorizationScopeMergeWhere({ tenantId: "foobar" } as TApiAuthorizationScopeWhere<ScopeEntity>, { tenantId: Like("%foo") } as TApiAuthorizationScopeWhere<ScopeEntity>);

			await repository.save({ id: "scope-1", tenantId: "foobar" });

			const query = repository.createQueryBuilder("scope").setFindOptions({ where });

			expect(query.getSql()).toContain(" AND ");
			await expect(query.getMany()).resolves.toEqual([]);
		} finally {
			await dataSource.destroy();
		}
	});

	it("converts conflicting id filters into a match-nothing branch", () => {
		const result = AuthorizationScopeMergeWhere({ id: "foreign-id" } as TApiAuthorizationScopeWhere<ScopeEntity>, { id: "own-id" } as TApiAuthorizationScopeWhere<ScopeEntity>) as Record<string, unknown>;

		expect(result.id).toMatchObject({
			_type: "in",
			_value: [],
		});
	});

	it("converts conflicting operatorId filters into a match-nothing branch", () => {
		const result = AuthorizationScopeMergeWhere({ operatorId: "foreign-operator" } as TApiAuthorizationScopeWhere<ScopeEntity>, { operatorId: "own-operator" } as TApiAuthorizationScopeWhere<ScopeEntity>) as Record<string, unknown>;

		expect(result.operatorId).toMatchObject({
			_type: "in",
			_value: [],
		});
	});

	it("converts nested path conflicts into a match-nothing branch", () => {
		const result = AuthorizationScopeMergeWhere({ operator: { id: "foreign-operator" } } as TApiAuthorizationScopeWhere<ScopeEntity>, { operator: { id: "own-operator" } } as TApiAuthorizationScopeWhere<ScopeEntity>) as {
			operator?: {
				id?: unknown;
			};
		};

		expect(result.operator?.id).toMatchObject({
			_type: "in",
			_value: [],
		});
	});

	it("preserves cartesian OR branches without overwriting conflicting values", () => {
		const result = AuthorizationScopeMergeWhere([{ id: "foreign-id" }, { id: "own-id" }] as TApiAuthorizationScopeWhere<ScopeEntity>, [{ operatorId: "operator-1" }, { id: "own-id" }] as TApiAuthorizationScopeWhere<ScopeEntity>) as Array<Record<string, unknown>>;

		expect(result).toHaveLength(4);
		expect(result[0]?.id).toMatchObject({ _type: "equal", _value: "foreign-id" });
		expect(result[0]?.operatorId).toMatchObject({ _type: "equal", _value: "operator-1" });
		expect(result[1]?.id).toMatchObject({
			_type: "in",
			_value: [],
		});
		expect(result[2]?.id).toMatchObject({ _type: "equal", _value: "own-id" });
		expect(result[2]?.operatorId).toMatchObject({ _type: "equal", _value: "operator-1" });
		expect(result[3]?.id).toMatchObject({ _type: "equal", _value: "own-id" });
	});
});
