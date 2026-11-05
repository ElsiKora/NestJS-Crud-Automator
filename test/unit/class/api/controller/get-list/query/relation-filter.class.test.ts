import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerGetListQueryPlan, IApiControllerGetListQueryPlanFilterField } from "@interface/class/api/controller/get-list/query";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";
import type { DataSourceOptions, EntityManager, ObjectLiteral, Repository } from "typeorm";

import { ApiControllerGetListQueryPlanCompiler, ApiControllerGetListQueryRelationFilterSubquery } from "@class/api/controller/get-list/query";
import { ApiSubqueryRaw } from "@class/api/subquery";
import { FILTER_OPERATOR_REGISTRY_CONSTANT } from "@constant/filter";
import { FILTER_RELATION_CONSTANT } from "@constant/filter/relation.constant";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiControllerGetListQueryFilterMissingBehavior, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { EFilterOperand, EFilterOperation } from "@enum/filter";
import { ApiControllerGetListQueryLink } from "@utility/api/controller/get-list/query/link.utility";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { ChildEntity, Column, DataSource, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryColumn, PrimaryGeneratedColumn, Raw, TableInheritance } from "typeorm";
import { describe, expect, it } from "vitest";

const describeId = (): PropertyDecorator => ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID } as TApiPropertyDescribeProperties);

const describeText = (properties: object = {}): PropertyDecorator => ApiPropertyDescribe({ description: "text", exampleValue: "text", format: EApiPropertyStringType.STRING, maxLength: 32, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING, ...properties } as TApiPropertyDescribeProperties);

const describeRelation = (): PropertyDecorator => ApiPropertyDescribe({ description: "relation", isAutoDtoEnabled: false, type: EApiPropertyDescribeType.RELATION } as TApiPropertyDescribeProperties);

const TRANSFORMER: { from: (value: string) => string; to: (value: string) => string } = { from: (value: string): string => value, to: (value: string): string => value };

@Entity("rf_unit_targets")
class RfTarget {
	@Column({ array: false, type: "varchar" })
	public bare!: string;

	@Column({ select: false, type: "varchar" })
	@describeText()
	public hiddenBySelect!: string;

	@Column({ type: "varchar" })
	@describeText({ properties: { [EApiRouteType.GET_LIST]: { query: { isEnabled: false } } } })
	public hiddenFromQuery!: string;

	@describeId()
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@describeRelation()
	@ManyToOne(() => RfTarget)
	public parent!: RfTarget;

	@Column({ type: "varchar" })
	@describeText()
	public state!: string;

	@Column({ transformer: TRANSFORMER, type: "varchar" })
	@describeText()
	public transformed!: string;
}

@Entity("rf_unit_middles")
class RfMiddle {
	@describeId()
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@describeRelation()
	@ManyToOne(() => RfTarget)
	public target!: RfTarget;
}

@Entity("rf_unit_chain_fours")
class RfChainFour {
	@describeId()
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@describeRelation()
	@ManyToOne(() => RfTarget)
	public target!: RfTarget;
}

@Entity("rf_unit_chain_threes")
class RfChainThree {
	@describeRelation()
	@ManyToOne(() => RfChainFour)
	public four!: RfChainFour;

	@describeId()
	@PrimaryGeneratedColumn("uuid")
	public id!: string;
}

@Entity("rf_unit_chain_twos")
class RfChainTwo {
	@describeId()
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@describeRelation()
	@ManyToOne(() => RfChainThree)
	public three!: RfChainThree;
}

@Entity("rf_unit_roots")
class RfRoot {
	@describeId()
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@describeRelation()
	@ManyToOne(() => RfMiddle)
	public middle!: RfMiddle;

	@Column({ type: "varchar" })
	@describeText()
	public region!: string;

	@describeRelation()
	@ManyToOne(() => RfChainTwo)
	public two!: RfChainTwo;

	@ApiPropertyDescribe({ description: "target", type: EApiPropertyDescribeType.RELATION } as TApiPropertyDescribeProperties)
	@ManyToOne(() => RfTarget)
	public visibleTarget!: RfTarget;
}

@Entity("rf_unit_links")
class RfLink {
	@describeId()
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@JoinColumn()
	@ManyToOne(() => RfRoot)
	public root!: RfRoot;

	@JoinColumn()
	@ManyToOne(() => RfTarget)
	public target!: RfTarget;

	@JoinColumn()
	@ManyToOne(() => RfMiddle)
	public wrong!: RfMiddle;
}

// A link whose target leads on: with the link counted as two hops, three more make five.
@Entity("rf_unit_chain_links")
class RfChainLink {
	@describeId()
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@JoinColumn()
	@ManyToOne(() => RfRoot)
	public root!: RfRoot;

	@JoinColumn()
	@ManyToOne(() => RfChainThree)
	public three!: RfChainThree;
}

// A route entity that holds the edge of a link as an inverse relation property.
@Entity("rf_unit_inverse_roots")
class RfInverseRoot {
	@describeId()
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@OneToMany(() => RfInverseLink, (link: RfInverseLink) => link.root)
	public links!: Array<RfInverseLink>;
}

@Entity("rf_unit_inverse_links")
class RfInverseLink {
	@describeId()
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@JoinColumn()
	@ManyToOne(() => RfInverseRoot, (root: RfInverseRoot) => root.links)
	public root!: RfInverseRoot;

	@JoinColumn()
	@ManyToOne(() => RfTarget)
	public target!: RfTarget;
}

// A route entity that holds the edge of a link as a ManyToMany over the table of the link.
@Entity("rf_unit_junction_roots")
class RfJunctionRoot {
	@describeId()
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@JoinTable({ inverseJoinColumn: { name: "targetId" }, joinColumn: { name: "rootId" }, name: "rf_unit_junction_links" })
	@ManyToMany(() => RfTarget)
	public targets!: Array<RfTarget>;
}

@Entity("rf_unit_junction_links")
class RfJunctionLink {
	@JoinColumn({ name: "rootId" })
	@ManyToOne(() => RfJunctionRoot)
	public root!: RfJunctionRoot;

	@PrimaryColumn({ type: "varchar" })
	public rootId!: string;

	@JoinColumn({ name: "targetId" })
	@ManyToOne(() => RfTarget)
	public target!: RfTarget;

	@PrimaryColumn({ type: "varchar" })
	public targetId!: string;
}

// A relation whose target shares the table of its parent.
@Entity("rf_unit_people")
@TableInheritance({ column: { name: "kind", type: "varchar" } })
class RfPerson {
	@describeId()
	@PrimaryGeneratedColumn("uuid")
	public id!: string;
}

@ChildEntity("employee")
class RfEmployee extends RfPerson {
	@Column({ nullable: true, type: "varchar" })
	@describeText()
	public department!: string;
}

@Entity("rf_unit_inheritance_roots")
class RfInheritanceRoot {
	@describeRelation()
	@ManyToOne(() => RfMiddle)
	public middle!: RfMiddle;

	@describeRelation()
	@ManyToOne(() => RfEmployee)
	public employee!: RfEmployee;

	@describeId()
	@PrimaryGeneratedColumn("uuid")
	public id!: string;
}

// A route entity with no plain primary column for the condition to attach to.
@Entity("rf_unit_transformed_roots")
class RfTransformedRoot {
	@describeId()
	@PrimaryColumn({ transformer: TRANSFORMER, type: "varchar" })
	public id!: string;

	@describeRelation()
	@ManyToOne(() => RfMiddle)
	public middle!: RfMiddle;
}

class RfController {}

const ENTITIES: Array<new () => unknown> = [RfChainFour, RfChainLink, RfChainThree, RfChainTwo, RfEmployee, RfInheritanceRoot, RfInverseLink, RfInverseRoot, RfJunctionLink, RfJunctionRoot, RfLink, RfMiddle, RfPerson, RfRoot, RfTarget, RfTransformedRoot];

const ENABLED: { allowedOperations: Array<EFilterOperation>; isEnabled: true; maxValues: number } = { allowedOperations: [EFilterOperation.EQ, EFilterOperation.IN], isEnabled: true, maxValues: 10 };

const compile = (entity: new () => object, filter: Record<string, unknown>): IApiControllerGetListQueryPlan | undefined =>
	ApiControllerGetListQueryPlanCompiler.compile(RfController, entity, GenerateEntityInformation<IApiBaseEntity>(entity as unknown as IApiBaseEntity), {
		request: {
			[EApiControllerRequestTarget.QUERY]: {
				filter: { unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT, ...filter },
			},
		},
	} as unknown as TApiControllerPropertiesRoute<IApiBaseEntity, EApiRouteType.GET_LIST>);

const field = (path: string, entry: unknown): Record<string, unknown> => ({ fields: { [path]: entry } });

const link = (name: string, entity: new () => object, source: string, target: string, fields: Record<string, unknown> = { id: ENABLED }): Record<string, unknown> => ({ fields: {}, links: { [name]: { entity, fields, source, target } } });

const createDataSource = async (entities: Array<new () => unknown>): Promise<DataSource> => {
	const dataSource: DataSource = new DataSource({ database: ":memory:", entities, type: "better-sqlite3" } as DataSourceOptions);

	await (dataSource as unknown as { buildMetadatas: () => Promise<void> }).buildMetadatas();

	return dataSource;
};

const assertPlan = async (entity: new () => object, filter: Record<string, unknown>, entities: Array<new () => unknown> = ENTITIES): Promise<void> => {
	const dataSource: DataSource = await createDataSource(entities);

	ApiControllerGetListQueryRelationFilterSubquery.assertPlan(compile(entity, filter) as IApiControllerGetListQueryPlan, dataSource.getRepository(entity as new () => ObjectLiteral), 'Controller "RfController" route "GET_LIST"');
};

describe("relation filter refusals at startup", () => {
	describe("while a controller is decorated", () => {
		it.each<[string, string, unknown, string]>([
			["an unknown hop", "nothing.target.id", ENABLED, '"nothing" is no relation of entity "RfRoot"'],
			["an unknown hop further on", "middle.nothing.id", ENABLED, '"nothing" is no relation of entity "RfMiddle"'],
			["a non-relation hop", "region.target.id", ENABLED, '"region" is no relation of entity "RfRoot"'],
			["an undescribed leaf", "middle.target.bare", ENABLED, '"bare" is no described column of entity "RfTarget"'],
			["an unknown leaf", "middle.target.nothing", ENABLED, '"nothing" is no described column of entity "RfTarget"'],
			["a relation as the leaf", "middle.target.parent", ENABLED, "it is not a scalar"],
			["a leaf the target's response hides", "middle.target.hiddenBySelect", ENABLED, "select: false"],
			["a leaf the target hides from a query", "middle.target.hiddenFromQuery", ENABLED, "not enabled as a GET_LIST query field"],
			["a leaf with a value transformer", "middle.target.transformed", ENABLED, "value transformer"],
			["a path over the hop limit", "two.three.four.target.parent.id", ENABLED, `more than the ${String(FILTER_RELATION_CONSTANT.MAXIMUM_HOPS)} a filter may cross`],
			["a membership operator without a cap", "middle.target.id", { allowedOperations: [EFilterOperation.IN], isEnabled: true }, "must declare maxValues"],
			["a cap below the range", "middle.target.id", { ...ENABLED, maxValues: 0 }, "integer from 1 to 100"],
			["a cap above the range", "middle.target.id", { ...ENABLED, maxValues: 101 }, "integer from 1 to 100"],
			["a cap that is no integer", "middle.target.id", { ...ENABLED, maxValues: 1.5 }, "integer from 1 to 100"],
			["a cap without a membership operator", "middle.target.id", { allowedOperations: [EFilterOperation.EQ], isEnabled: true, maxValues: 5 }, "without a membership operator"],
			["an entry without isEnabled", "middle.target.id", { allowedOperations: [EFilterOperation.EQ] }, "must declare isEnabled"],
			["an unknown key on an entry", "middle.target.id", { ...ENABLED, nothing: true }, "nothing"],
			["a default condition without USE_DEFAULT", "middle.target.id", { ...ENABLED, defaultCondition: { operator: EFilterOperation.EQ, value: "00000000-0000-4000-8000-000000000000" } }, "only with USE_DEFAULT"],
			["USE_DEFAULT without a default condition", "middle.target.id", { ...ENABLED, missingBehavior: EApiControllerGetListQueryFilterMissingBehavior.USE_DEFAULT }, "defaultCondition"],
			["a condition on a column the target does not describe", "middle.target.id", { ...ENABLED, relationConditions: [{ field: "bare", operator: EFilterOperation.EQ, value: "x" }] }, '"bare" is no described column of entity "RfTarget"'],
			["a condition on a relation the path does not cross", "middle.target.id", { ...ENABLED, relationConditions: [{ field: "id", operator: EFilterOperation.EQ, relation: "nothing", value: "x" }] }, 'names relation "nothing", which the path does not cross'],
			["a condition with a value its column refuses", "middle.target.id", { ...ENABLED, relationConditions: [{ field: "id", operator: EFilterOperation.EQ, value: "not-a-uuid" }] }, "relationConditions value"],
			["a condition asking about absence", "middle.target.id", { ...ENABLED, relationConditions: [{ field: "state", operator: EFilterOperation.ISNULL }] }, "asks about the absence of a value"],
			["a condition on a column with a value transformer", "middle.target.id", { ...ENABLED, relationConditions: [{ field: "transformed", operator: EFilterOperation.EQ, value: "x" }] }, "value transformer"],
		])("refuses %s, naming the controller, the route and the field", (_case: string, path: string, entry: unknown, reason: string) => {
			expect(() => compile(RfRoot, field(path, entry))).toThrowError(reason);
			expect(() => compile(RfRoot, field(path, entry))).toThrowError(`Controller "RfController" route "getList": GET_LIST filter field "${path}"`);
		});

		it.each([...FILTER_RELATION_CONSTANT.ABSENCE_OPERATIONS])("refuses the absence operator %s on an EXISTS path", (operation: EFilterOperation) => {
			expect(() => compile(RfRoot, field("middle.target.id", { allowedOperations: [operation], isEnabled: true, maxValues: 10 }))).toThrowError("a relation filter means that a related row exists that matches");
		});

		it("refuses absence on a one-hop path with fixed conditions, which is an EXISTS path too", () => {
			expect(() => compile(RfRoot, field("visibleTarget.id", { allowedOperations: [EFilterOperation.ISNULL], isEnabled: true, relationConditions: [{ field: "state", operator: EFilterOperation.EQ, value: "ACTIVE" }] }))).toThrowError("a relation filter means that a related row exists that matches");
		});

		it("needs a cap on a membership operator of a one-hop path with fixed conditions", () => {
			expect(() => compile(RfRoot, field("visibleTarget.id", { allowedOperations: [EFilterOperation.IN], isEnabled: true, relationConditions: [{ field: "state", operator: EFilterOperation.EQ, value: "ACTIVE" }] }))).toThrowError("must declare maxValues");
		});

		it("refuses a hidden one-hop root with fixed conditions: it stays refused as today", () => {
			expect(() => compile(RfRoot, field("middle.id", { allowedOperations: [EFilterOperation.EQ], isEnabled: true, relationConditions: [] }))).toThrowError('GET_LIST filter field "middle.id" is not an enabled direct scalar or one-hop to-one scalar path');
		});

		it("adds no reach without a declaration", () => {
			const plan: IApiControllerGetListQueryPlan | undefined = compile(RfRoot, { fields: {}, unlistedFields: EApiControllerGetListQueryUnlistedFields.INHERIT });

			expect(Object.keys(plan?.filter.fields ?? {}).filter((path: string): boolean => path.split(".").length > 2)).toEqual([]);
			expect(Object.values(plan?.filter.fields ?? {}).some((entry: IApiControllerGetListQueryPlanFilterField): boolean => entry.relationFilter !== undefined)).toBe(false);
		});

		it("offers nothing for an entry that disables a path", () => {
			expect(compile(RfRoot, field("middle.target.id", { isEnabled: false }))?.filter.fields["middle.target.id"]).toBeUndefined();
		});

		it("keeps a disabled entry to its one key", () => {
			expect(() => compile(RfRoot, field("middle.target.id", { allowedOperations: [EFilterOperation.EQ], isEnabled: false }))).toThrowError("Disabled Controller");
		});

		it("applies maxValues to a plain typed field, and to its default", () => {
			const plan: IApiControllerGetListQueryPlan | undefined = compile(RfRoot, field("id", { allowedOperations: [EFilterOperation.IN], isEnabled: true, maxValues: 7 }));

			expect(plan?.filter.fields.id?.maxValues).toBe(7);
			expect(() => compile(RfRoot, field("id", { allowedOperations: [EFilterOperation.IN], defaultCondition: { operator: EFilterOperation.IN, values: ["00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000002"] }, isEnabled: true, maxValues: 1, missingBehavior: EApiControllerGetListQueryFilterMissingBehavior.USE_DEFAULT }))).toThrowError("more values than its maxValues");
			expect(compile(RfRoot, field("id", { allowedOperations: [EFilterOperation.IN], isEnabled: true }))?.filter.fields.id?.maxValues).toBeUndefined();
		});

		it("refuses fixed conditions on a direct column", () => {
			expect(() => compile(RfRoot, field("region", { allowedOperations: [EFilterOperation.EQ], isEnabled: true, relationConditions: [] }))).toThrowError("relationConditions");
		});

		describe("a link", () => {
			it.each<[string, Record<string, unknown>, string]>([
				["named as a column of the route entity", link("region", RfLink, "root", "target"), "the name equals a property of the route entity"],
				["named as a relation of the route entity", link("middle", RfLink, "root", "target"), "the name equals a property of the route entity"],
				["with a name that is no identifier", link("a.b", RfLink, "root", "target"), "must be a plain identifier"],
				["with an unsafe name", { fields: {}, links: JSON.parse('{"__proto__":{"entity":null,"fields":{},"source":"root","target":"target"}}') as Record<string, unknown> }, "must be a plain identifier"],
				["whose source is no relation", link("named", RfLink, "id", "target"), '"id" is no relation of link entity "RfLink"'],
				["whose target is no relation", link("named", RfLink, "root", "id"), '"id" is no relation of link entity "RfLink"'],
				["whose source does not point back at the route entity", link("named", RfLink, "wrong", "target"), 'source relation "wrong" of link entity "RfLink" does not point back at route entity "RfRoot"'],
				["whose path runs past the hop limit", link("named", RfChainLink, "root", "three", { "four.target.parent.id": ENABLED }), `more than the ${String(FILTER_RELATION_CONSTANT.MAXIMUM_HOPS)} a filter may cross`],
				["that declares no fields", link("named", RfLink, "root", "target", {}), "declares no fields"],
				["with a hidden leaf", link("named", RfLink, "root", "target", { hiddenBySelect: ENABLED }), "select: false"],
				["with an absence operator", link("named", RfLink, "root", "target", { id: { allowedOperations: [EFilterOperation.NOTIN], isEnabled: true, maxValues: 5 } }), "a relation filter means that a related row exists that matches"],
				["with a membership operator without a cap", link("named", RfLink, "root", "target", { id: { allowedOperations: [EFilterOperation.IN], isEnabled: true } }), "must declare maxValues"],
			])("refuses one %s", (_case: string, filter: Record<string, unknown>, reason: string) => {
				expect(() => compile(RfRoot, filter)).toThrowError(reason);
			});

			it("refuses a to-many relation as its target or source", () => {
				expect(() => compile(RfInverseRoot, link("named", RfInverseRoot, "links", "links"))).toThrowError('relation "links" of link entity "RfInverseRoot" is not an owning to-one relation');
			});

			it("refuses a query name that a key of fields already uses", () => {
				expect(() => compile(RfRoot, { fields: { "named.id": ENABLED }, links: link("named", RfLink, "root", "target").links })).toThrowError('both a key of fields and a field of link "named" use this query name');
			});

			it("names a field by the link, and carries the helper's values", () => {
				const links = { named: ApiControllerGetListQueryLink(RfLink, { fields: { id: { allowedOperations: [EFilterOperation.EQ], isEnabled: true } }, source: "root", target: "target" }) };
				const plan: IApiControllerGetListQueryPlan | undefined = compile(RfRoot, { fields: {}, links });

				expect(plan?.filter.fields["named.id"]?.relationFilter?.hops).toEqual([{ entity: RfLink, relation: "target", source: "root", target: RfTarget }]);
			});

			it("adds no link through unlisted fields", () => {
				const plan: IApiControllerGetListQueryPlan | undefined = compile(RfRoot, { fields: {}, unlistedFields: EApiControllerGetListQueryUnlistedFields.INHERIT });

				expect(Object.keys(plan?.filter.fields ?? {}).some((path: string): boolean => path.startsWith("named."))).toBe(false);
			});
		});
	});

	describe("against the DataSource that reads the route", () => {
		it("accepts a path and a link it can read", async () => {
			await expect(assertPlan(RfRoot, { fields: { "middle.target.id": ENABLED }, links: link("named", RfLink, "root", "target").links })).resolves.toBeUndefined();
		});

		it("refuses a path through an entity of another DataSource, naming the route and the field", async () => {
			await expect(assertPlan(RfRoot, field("middle.target.id", ENABLED), [RfChainFour, RfChainThree, RfChainTwo, RfMiddle, RfRoot])).rejects.toThrowError();

			// A DataSource needs every relation target to build, so the check runs on a route read by a DataSource that knows the first hop only.
			const dataSource: DataSource = await createDataSource([RfChainFour, RfChainThree, RfChainTwo, RfMiddle, RfRoot, RfTarget]);
			const plan = compile(RfRoot, field("middle.target.id", ENABLED)) as IApiControllerGetListQueryPlan;
			const hopField: IApiControllerGetListQueryPlanFilterField = plan.filter.fields["middle.target.id"] as IApiControllerGetListQueryPlanFilterField;
			const foreignField: IApiControllerGetListQueryPlanFilterField = { ...hopField, relationFilter: { ...hopField.relationFilter, hops: [{ ...hopField.relationFilter?.hops[0], target: RfLink }] } } as never;

			expect(() => {
				ApiControllerGetListQueryRelationFilterSubquery.assertPlan({ ...plan, filter: { ...plan.filter, fields: { "middle.target.id": foreignField } } }, dataSource.getRepository(RfRoot), 'Controller "RfController" route "GET_LIST"');
			}).toThrowError('Controller "RfController" route "GET_LIST": GET_LIST filter field "middle.target.id" crosses entity "RfLink", which is not an entity of the DataSource that reads the route');
		});

		it("refuses a link entity of another DataSource", async () => {
			await expect(assertPlan(RfRoot, link("named", RfLink, "root", "target"), [RfChainFour, RfChainThree, RfChainTwo, RfMiddle, RfRoot, RfTarget])).rejects.toThrowError('link entity "RfLink" is not an entity of the DataSource that reads the route');
		});

		it("refuses a target its dialect cannot compile", async () => {
			const dataSource: DataSource = await createDataSource(ENTITIES);
			const repository: Repository<ObjectLiteral> = dataSource.getRepository(RfRoot);
			const foreignDataSource: DataSource = Object.create(dataSource) as DataSource;
			const foreignManager: EntityManager = Object.create(dataSource.manager) as EntityManager;
			const foreign: Repository<ObjectLiteral> = Object.create(repository) as Repository<ObjectLiteral>;

			Object.defineProperty(foreignDataSource, "options", { value: { type: "oracle" } });
			Object.defineProperty(foreignManager, "dataSource", { value: foreignDataSource });

			Object.defineProperty(foreign, "manager", { value: foreignManager });

			expect(() => {
				ApiControllerGetListQueryRelationFilterSubquery.assertPlan(compile(RfRoot, field("middle.target.id", ENABLED)) as IApiControllerGetListQueryPlan, foreign, 'Controller "RfController" route "GET_LIST"');
			}).toThrowError('cannot compile on driver "oracle"');
		});

		it("refuses a link for an edge the route entity holds as an inverse relation, and names the path", async () => {
			await expect(assertPlan(RfInverseRoot, link("named", RfInverseLink, "root", "target"))).rejects.toThrowError('use "links.target.<field>" in fields instead of a link');
		});

		it("refuses a link for an edge the route entity holds as a ManyToMany, and names the path", async () => {
			await expect(assertPlan(RfJunctionRoot, link("named", RfJunctionLink, "root", "target"))).rejects.toThrowError('use "targets.<field>" in fields instead of a link');
		});

		it("refuses a relation whose target is a single-table-inheritance child", async () => {
			await expect(assertPlan(RfInheritanceRoot, field("employee.id.id", ENABLED))).rejects.toThrowError();
			await expect(assertPlan(RfInheritanceRoot, { fields: { "employee.id": { allowedOperations: [EFilterOperation.EQ], isEnabled: true, relationConditions: [] } } })).rejects.toThrowError();

			const dataSource: DataSource = await createDataSource(ENTITIES);
			const plan = compile(RfRoot, field("middle.target.id", ENABLED)) as IApiControllerGetListQueryPlan;
			const hopField: IApiControllerGetListQueryPlanFilterField = plan.filter.fields["middle.target.id"] as IApiControllerGetListQueryPlanFilterField;
			const childField: IApiControllerGetListQueryPlanFilterField = { ...hopField, relationFilter: { conditions: [], hops: [{ entity: RfInheritanceRoot, relation: "employee", target: RfEmployee }], isDeclaredReach: true, leafEntity: RfEmployee, leafProperty: "id" } } as never;

			expect(() => {
				ApiControllerGetListQueryRelationFilterSubquery.assertPlan({ ...plan, filter: { ...plan.filter, fields: { "employee.id": childField } } }, dataSource.getRepository(RfInheritanceRoot), 'Controller "RfController" route "GET_LIST"');
			}).toThrowError('crosses entity "RfEmployee", which shares the table of its single-table-inheritance parent');
		});

		it("refuses a service with no TypeORM repository, and never passes the dotted key on", () => {
			const plan = compile(RfRoot, field("middle.target.id", ENABLED)) as IApiControllerGetListQueryPlan;

			expect(() => {
				ApiControllerGetListQueryRelationFilterSubquery.assertPlan(plan, {} as Repository<ObjectLiteral>, 'Controller "RfController" route "GET_LIST"');
			}).toThrowError('GET_LIST filter field "middle.target.id" needs a TypeORM repository');
		});

		it("refuses a route entity with no plain primary column to attach to", async () => {
			await expect(assertPlan(RfTransformedRoot, field("middle.target.id", ENABLED))).rejects.toThrowError('entity "RfTransformedRoot" has no primary column');
		});
	});
});

describe("library raw registry", () => {
	const HOSTILE: Array<unknown> = ["1=1", "' OR 1=1 --", "EXISTS (SELECT 1)", { _getSql: "x", _type: "raw", _useParameter: true, _value: "1=1", "@instanceof": Symbol.for("FindOperator") }, { "@instanceof": "x", getSql: "x", type: "raw" }, () => "1=1", ["1=1"], 1, true, null, undefined];

	it("never accepts anything a client can send", () => {
		for (const value of HOSTILE) {
			expect(ApiSubqueryRaw.isLibraryRaw(value)).toBe(false);
			expect(ApiSubqueryRaw.isLibraryRaw(JSON.parse(JSON.stringify(value) ?? "null"))).toBe(false);
		}
	});

	it("never accepts what an operator writes from a client value", () => {
		// An operator with no kinds is no filter a client can choose.
		for (const descriptor of Object.values(FILTER_OPERATOR_REGISTRY_CONSTANT.OPERATORS).filter((candidate: { kinds: ReadonlyArray<unknown> }): boolean => candidate.kinds.length > 0)) {
			for (const driverType of FILTER_RELATION_CONSTANT.SUPPORTED_DRIVER_TYPES) {
				const operand: unknown = descriptor.operand === EFilterOperand.VALUE ? "' OR 1=1 --" : descriptor.operand === EFilterOperand.NONE ? undefined : ["' OR 1=1 --", "x"];
				const compiled = descriptor.compile(operand, driverType as never) as unknown as { getSql?: unknown };

				expect(ApiSubqueryRaw.isLibraryRaw(compiled)).toBe(false);
				expect(ApiSubqueryRaw.isLibraryRaw(compiled.getSql)).toBe(false);
			}
		}
	});

	it("never accepts a raw written by anyone else with the same text", () => {
		const sql = (alias: string): string => `${alias} = 1`;
		const raw = Raw(sql) as unknown as { getSql?: unknown };

		expect(ApiSubqueryRaw.isLibraryRaw(raw.getSql)).toBe(false);
		expect(ApiSubqueryRaw.isLibraryRaw(sql)).toBe(false);
	});

	it("accepts what the library writes, and binds a client value instead of writing it", async () => {
		const dataSource: DataSource = await createDataSource(ENTITIES);
		const plan = compile(RfRoot, field("middle.target.id", ENABLED)) as IApiControllerGetListQueryPlan;
		const hostile: string = "' OR 1=1 --";
		const descriptor = FILTER_OPERATOR_REGISTRY_CONSTANT.OPERATORS[EFilterOperation.EQ];
		const { operator } = ApiControllerGetListQueryRelationFilterSubquery.compile(plan.filter.fields["middle.target.id"] as IApiControllerGetListQueryPlanFilterField, descriptor.compile(hostile, "better-sqlite3"), dataSource.getRepository(RfRoot), "route") as { operator: { getSql?: (alias: string) => string; objectLiteralParameters?: Record<string, unknown> } };
		const sql: string = String(operator.getSql?.("RfRoot.id"));

		expect(ApiSubqueryRaw.isLibraryRaw(operator.getSql)).toBe(true);
		expect(sql).not.toContain(hostile);
		expect(Object.values(operator.objectLiteralParameters ?? {})).toEqual([hostile]);
		expect(sql).toContain('"relation_filter_0"."id" = "RfRoot"."middleId"');
	});
});
