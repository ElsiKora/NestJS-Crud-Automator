import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { IApiAuthorizationDecision, IApiAuthorizationPrincipal, IApiPolicyDocumentRecord, IApiPolicyStatement } from "../../src/index";

import { Test } from "@nestjs/testing";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiAuthorizationSimulator, ApiPropertyDescribe, AuthorizationResolveDefaultPrincipal, EApiAuthorizationMode, EApiAuthorizationPrincipalType, EApiPolicyEffect, EApiPolicySourceType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../src/index";

enum ESimulatorKind {
	PLAYER = "PLAYER",
	STAFF = "STAFF",
}

const NAMESPACE: string = "sim:orphan";
const OWN_OPERATOR: string = "11111111-1111-4111-8111-111111111111";
const OTHER_OPERATOR: string = "22222222-2222-4222-8222-222222222222";
const PRINCIPAL: IApiAuthorizationPrincipal = AuthorizationResolveDefaultPrincipal({ attributes: { operatorId: OWN_OPERATOR }, id: "user-1" } as never);

// Neither entity is registered with any DataSource, and the module imports none: the simulator evaluates each row in memory.
@Entity("sim_operators")
class SimulatorOperatorEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;
}

@Entity("sim_rows")
class SimulatorRowEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ enum: ESimulatorKind, type: "enum" })
	@ApiPropertyDescribe({ description: "kind", enum: ESimulatorKind, enumName: "ESimulatorKind", type: EApiPropertyDescribeType.ENUM })
	public kind!: ESimulatorKind;

	@Column({ length: 64, type: "varchar" })
	@ApiPropertyDescribe({ description: "name", exampleValue: "own", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 0, pattern: "/^.*$/", type: EApiPropertyDescribeType.STRING })
	public name!: string;

	@ManyToOne(() => SimulatorOperatorEntity)
	@JoinColumn({ name: "operatorId" })
	public operator!: SimulatorOperatorEntity;

	@Column({ type: "uuid" })
	@ApiPropertyDescribe({ description: "owner", type: EApiPropertyDescribeType.UUID })
	public ownerId!: string;
}

const AUTHORIZATION: unknown = {
	defaultMode: EApiAuthorizationMode.IAM,
	policyNamespace: NAMESPACE,
	resourceDefinition: {
		entity: SimulatorRowEntity,
		fields: [
			{ isFilterable: true, path: "resource.id", queryPath: "id" },
			{ isFilterable: true, path: "resource.kind", queryPath: "kind" },
			{ isFilterable: true, path: "resource.name", queryPath: "name" },
			{ isFilterable: true, path: "resource.operator.id", queryPath: "operator.id" },
			{ isFilterable: true, path: "resource.ownerId", queryPath: "ownerId" },
		],
		namespace: NAMESPACE,
		resourcePath: `${NAMESPACE}/{id}`,
		resourceType: NAMESPACE,
	},
};

const OWN_ROW: Record<string, unknown> = { id: "aaaaaaaa-0000-4000-8000-000000000001", kind: ESimulatorKind.STAFF, name: "own", operator: { id: OWN_OPERATOR }, ownerId: OWN_OPERATOR };
const OTHER_ROW: Record<string, unknown> = { id: "aaaaaaaa-0000-4000-8000-000000000002", kind: ESimulatorKind.PLAYER, name: "other", operator: { id: OTHER_OPERATOR }, ownerId: OTHER_OPERATOR };

const allow = (condition?: Record<string, Record<string, unknown>>): IApiPolicyStatement => ({ Action: [`${NAMESPACE}:*`], ...(condition ? { Condition: condition } : {}), Effect: "Allow", Resource: [`${NAMESPACE}/*`] }) as IApiPolicyStatement;

describe("ApiAuthorizationSimulator with no registered DataSource (E2E)", () => {
	let app: INestApplication | undefined;
	let simulator: ApiAuthorizationSimulator;
	let statements: Array<IApiPolicyStatement> = [];

	const effect = async (resource: Record<string, unknown>): Promise<EApiPolicyEffect> => {
		const decision: IApiAuthorizationDecision<SimulatorRowEntity> = await simulator.evaluate({ action: `${NAMESPACE}:read`, authorization: AUTHORIZATION as never, entity: SimulatorRowEntity, principal: PRINCIPAL, resource: resource as never, routeType: EApiRouteType.GET });

		return decision.effect;
	};

	beforeAll(async () => {
		const moduleReference = await Test.createTestingModule({
			imports: [
				ApiAuthorizationModule.forRoot({
					iam: {
						attachmentSources: [{ getAttachments: async () => await Promise.resolve({ attachments: [{ policyId: "sim-policy", principalId: PRINCIPAL.id, principalType: EApiAuthorizationPrincipalType.USER }], boundaries: [] }) }],
						documentSources: [
							{
								getDocumentsByIds: async (ids: ReadonlyArray<string>): Promise<ReadonlyArray<IApiPolicyDocumentRecord>> => await Promise.resolve(ids.includes("sim-policy") ? [{ document: { Statement: statements, Version: "2012-10-17" }, id: "sim-policy", namespace: NAMESPACE, sourceType: EApiPolicySourceType.DATABASE, version: "1" }] : []),
							},
						],
					},
					principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) },
				} as never),
			],
		}).compile();

		app = moduleReference.createNestApplication();
		await app.init();
		simulator = app.get(ApiAuthorizationSimulator);
	});

	afterAll(async () => {
		await app?.close();
	});

	it("allows every row under a plain Allow", async () => {
		statements = [allow()];

		expect([await effect(OWN_ROW), await effect(OTHER_ROW)]).toEqual([EApiPolicyEffect.ALLOW, EApiPolicyEffect.ALLOW]);
	});

	// With no DataSource the entity reads the portable dialect, which cannot tell whether the database compares text with case; an equality grants nothing, even on the row it names.
	it.each([
		["a text column", { StringEquals: { "resource.name": "own" } }],
		["a uuid column against a principal attribute", { StringEquals: { "resource.ownerId": "${principal.attributes.operatorId}" } }],
		["an enum column", { StringEquals: { "resource.kind": ESimulatorKind.STAFF } }],
		["a relation key of a nested row", { StringEquals: { "resource.operator.id": "${principal.attributes.operatorId}" } }],
	])("denies every row under a StringEquals Allow on %s", async (_name: string, condition: Record<string, Record<string, unknown>>) => {
		statements = [allow(condition)];

		expect([await effect(OWN_ROW), await effect(OTHER_ROW)]).toEqual([EApiPolicyEffect.DENY, EApiPolicyEffect.DENY]);
	});

	it("reads resource.operator.id from a nested operator row, and a flat operatorId property does not count", async () => {
		statements = [allow({ Null: { "resource.operator.id": "false" } })];

		expect(await effect(OWN_ROW)).toBe(EApiPolicyEffect.ALLOW);
		expect(await effect({ ...OWN_ROW, operator: undefined, operatorId: OWN_OPERATOR })).toBe(EApiPolicyEffect.DENY);
	});
});
