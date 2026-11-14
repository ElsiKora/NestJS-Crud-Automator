import type { IApiAuthorizationPrincipal, IApiAuthorizationRequestMetadata, IApiAuthorizationResourceDefinition, IApiPolicyStatement } from "@interface/class/api/authorization";

import { ApiAuthorizationIamEngine, ApiAuthorizationIamQueryPlanner } from "@class/api/authorization/iam";
import { ApiAuthorizationRuntime } from "@class/api/authorization/runtime.class";
import { ApiAuthorizationSimulator } from "@class/api/authorization/simulator.class";
import { EApiAuthorizationMode } from "@enum/class/authorization";
import { EApiAuthorizationDecisionType, EApiAuthorizationIamDialect, EApiAuthorizationPrincipalType, EApiPolicyEffect, EApiPolicySourceType } from "@enum/class/authorization";
import { EApiRouteType } from "@enum/decorator/api";
import { Column, Entity, PrimaryColumn } from "typeorm";
import { describe, expect, it, vi } from "vitest";

// The anchor of a controller whose rows are not an entity of the application: it has no column for `{id}`.
@Entity("engine_route_bound_anchors")
class EngineRouteBoundAnchorEntity {
	@Column({ type: "integer" })
	public revision!: number;

	@PrimaryColumn({ type: "varchar" })
	public sectionName!: string;
}

const NAMESPACE: string = "internal:config-data";

const definition: IApiAuthorizationResourceDefinition<EngineRouteBoundAnchorEntity> = {
	entity: EngineRouteBoundAnchorEntity,
	fields: [{ isFilterable: true, path: "resource.section.name", queryPath: "sectionName" }],
	namespace: NAMESPACE,
	resourcePath: `${NAMESPACE}/{id}`,
	resourceType: NAMESPACE,
	routeParameters: ["id"],
};

// The same resource without routeParameters, as 5.3.1 read it.
const columnlessDefinition: IApiAuthorizationResourceDefinition<EngineRouteBoundAnchorEntity> = { ...definition, routeParameters: undefined };

const principal: IApiAuthorizationPrincipal = { attributes: {}, id: "user-1", roles: [], type: EApiAuthorizationPrincipalType.USER };

interface IRequest {
	action: string;
	requestMetadata?: IApiAuthorizationRequestMetadata<EngineRouteBoundAnchorEntity>;
	resource?: EngineRouteBoundAnchorEntity;
	routeType: EApiRouteType;
}

const LIST: IRequest = { action: `${NAMESPACE}:list`, routeType: EApiRouteType.GET_LIST };
const CREATE: IRequest = { action: `${NAMESPACE}:create`, routeType: EApiRouteType.CREATE };
const read = (id: string): IRequest => ({ action: `${NAMESPACE}:read`, requestMetadata: { parameters: { id } }, routeType: EApiRouteType.GET });
const update = (id: string): IRequest => ({ action: `${NAMESPACE}:update`, requestMetadata: { parameters: { id } }, routeType: EApiRouteType.UPDATE });

const statement = (effect: EApiPolicyEffect, target: Partial<IApiPolicyStatement>): IApiPolicyStatement => ({ Action: [`${NAMESPACE}:*`], Effect: effect, ...target });
const allow = (...resources: Array<string>): IApiPolicyStatement => statement(EApiPolicyEffect.ALLOW, { Resource: resources });
const deny = (...resources: Array<string>): IApiPolicyStatement => statement(EApiPolicyEffect.DENY, { Resource: resources });
const row = (id: string): string => `${NAMESPACE}/${id}`;
const EVERY_ROW: string = row("*");

const evaluate = async (request: IRequest, statements: ReadonlyArray<IApiPolicyStatement>, resourceDefinition: IApiAuthorizationResourceDefinition<EngineRouteBoundAnchorEntity> = definition) =>
	await new ApiAuthorizationIamEngine(new ApiAuthorizationIamQueryPlanner()).evaluate<EngineRouteBoundAnchorEntity>({
		action: request.action,
		attachments: { attachments: [{ policyId: "identity", principalId: principal.id, principalType: principal.type }], boundaries: [] },
		dialect: { driverType: "postgres", type: EApiAuthorizationIamDialect.POSTGRES },
		documents: [{ document: { Statement: statements, Version: "2012-10-17" }, id: "identity", namespace: NAMESPACE, sourceType: EApiPolicySourceType.MANAGED, version: "1" }],
		policyNamespace: NAMESPACE,
		principal,
		requestMetadata: request.requestMetadata ?? {},
		resource: request.resource,
		resourceDefinition,
		routeType: request.routeType,
	});

const readType = async (request: IRequest, statements: ReadonlyArray<IApiPolicyStatement>, resourceDefinition?: IApiAuthorizationResourceDefinition<EngineRouteBoundAnchorEntity>): Promise<EApiAuthorizationDecisionType | undefined> => (await evaluate(request, statements, resourceDefinition)).trace.decisionType;

const ALLOWED: EApiAuthorizationDecisionType = EApiAuthorizationDecisionType.EXPLICIT_ALLOW;
const DENIED: EApiAuthorizationDecisionType = EApiAuthorizationDecisionType.EXPLICIT_DENY;
const IMPLICIT: EApiAuthorizationDecisionType = EApiAuthorizationDecisionType.IMPLICIT_DENY;

describe("ApiAuthorizationIamEngine route-bound placeholders", () => {
	describe("on a route that carries the route parameter", () => {
		it("admits exactly the id an Allow names", async () => {
			expect(await readType(read("a"), [allow(row("a"))])).toBe(ALLOWED);
			expect(await readType(read("b"), [allow(row("a"))])).toBe(IMPLICIT);
			expect(await readType(update("a"), [allow(row("a"))])).toBe(ALLOWED);
		});

		it("refuses exactly the id a Deny names beside an Allow of every row", async () => {
			expect(await readType(read("a"), [allow(EVERY_ROW), deny(row("a"))])).toBe(DENIED);
			expect(await readType(read("b"), [allow(EVERY_ROW), deny(row("a"))])).toBe(ALLOWED);
			expect(await readType(update("b"), [allow(EVERY_ROW), deny(row("a"))])).toBe(ALLOWED);
		});

		it("keeps wildcards: every row, a glob over the text, and a NotResource", async () => {
			expect(await readType(read("a"), [allow(EVERY_ROW)])).toBe(ALLOWED);
			expect(await readType(read("ab"), [allow(row("a*"))])).toBe(ALLOWED);
			expect(await readType(read("ba"), [allow(row("a*"))])).toBe(IMPLICIT);
			expect(await readType(read("ab"), [allow(row("a?"))])).toBe(ALLOWED);
			expect(await readType(read("a"), [statement(EApiPolicyEffect.ALLOW, { NotResource: [row("a")] })])).toBe(IMPLICIT);
			expect(await readType(read("b"), [statement(EApiPolicyEffect.ALLOW, { NotResource: [row("a")] })])).toBe(ALLOWED);
		});

		it("compares the path text exactly, letter case included", async () => {
			expect(await readType(read("A"), [allow(row("a"))])).toBe(IMPLICIT);
			expect(await readType(read("A"), [allow(EVERY_ROW), deny(row("a"))])).toBe(ALLOWED);
		});

		it("names no resource when the path value holds a separator of the resource path", async () => {
			expect(await readType(read("a/b"), [allow(row("a/b"))])).toBe(IMPLICIT);
			expect(await readType(read("a/b"), [allow(EVERY_ROW), deny(row("a"))])).toBe(DENIED);
		});

		it("keeps the condition keys of the anchor's fields as the scope", async () => {
			const decision = await evaluate(read("a"), [statement(EApiPolicyEffect.ALLOW, { Condition: { StringEquals: { "resource.section.name": "withdrawal" } }, Resource: [row("a")] })]);

			expect(decision.trace.decisionType).toBe(ALLOWED);
			expect(decision.scope?.where).toEqual({ sectionName: "withdrawal" });
		});

		it("reads the path value, not a property of a loaded resource", async () => {
			const loaded: EngineRouteBoundAnchorEntity = Object.assign(new EngineRouteBoundAnchorEntity(), { id: "b", revision: 1, sectionName: "withdrawal" });

			expect(await readType({ ...read("a"), resource: loaded }, [allow(row("a"))])).toBe(ALLOWED);
			expect(await readType({ ...read("a"), resource: loaded }, [allow(row("b"))])).toBe(IMPLICIT);
		});

		it("fails a statement that names one row closed without routeParameters, as before", async () => {
			expect(await readType(read("a"), [allow(row("a"))], columnlessDefinition)).toBe(IMPLICIT);
			expect(await readType(read("b"), [allow(EVERY_ROW), deny(row("a"))], columnlessDefinition)).toBe(DENIED);
		});
	});

	describe("on a list, which carries no route parameter", () => {
		it("lists every row under an Allow of every row", async () => {
			const decision = await evaluate(LIST, [allow(EVERY_ROW)]);

			expect(decision.trace.decisionType).toBe(ALLOWED);
			expect(decision.scope).toBeUndefined();
		});

		it("does not apply an Allow that names one id, so another Allow still lists", async () => {
			expect(await readType(LIST, [allow(row("a"))])).toBe(IMPLICIT);
			expect(await readType(LIST, [allow(row("a")), allow(EVERY_ROW)])).toBe(ALLOWED);
			expect(await readType(LIST, [allow(EVERY_ROW), allow(row("a"))])).toBe(ALLOWED);
			expect(await readType(LIST, [allow(row("a*"))])).toBe(IMPLICIT);
		});

		it("refuses the whole list under a Deny that names one id, since no column can exclude the row", async () => {
			expect(await readType(LIST, [allow(EVERY_ROW), deny(row("a"))])).toBe(DENIED);
			expect(await readType(LIST, [allow(EVERY_ROW), statement(EApiPolicyEffect.DENY, { NotResource: [row("a")] })])).toBe(DENIED);
		});

		it("does not apply an Allow NotResource that names one id", async () => {
			expect(await readType(LIST, [statement(EApiPolicyEffect.ALLOW, { NotResource: [row("a")] })])).toBe(IMPLICIT);
		});

		it("keeps the condition keys of the anchor's fields as the scope", async () => {
			const decision = await evaluate(LIST, [statement(EApiPolicyEffect.ALLOW, { Condition: { StringEquals: { "resource.section.name": "withdrawal" } }, Resource: [EVERY_ROW] })]);

			expect(decision.trace.decisionType).toBe(ALLOWED);
			expect(decision.scope?.where).toEqual({ sectionName: "withdrawal" });
		});
	});

	describe("on a create, which carries no route parameter", () => {
		it("admits under an Allow of every row and not under an Allow of one id", async () => {
			expect(await readType(CREATE, [allow(EVERY_ROW)])).toBe(ALLOWED);
			expect(await readType(CREATE, [allow(row("a"))])).toBe(IMPLICIT);
		});

		it("refuses the create under a Deny that names one id", async () => {
			expect(await readType(CREATE, [allow(EVERY_ROW), deny(row("a"))])).toBe(DENIED);
		});
	});

	describe("on a loaded resource without the route parameter", () => {
		const loaded: EngineRouteBoundAnchorEntity = Object.assign(new EngineRouteBoundAnchorEntity(), { revision: 1, sectionName: "withdrawal" });
		const unfilled: IRequest = { action: `${NAMESPACE}:read`, resource: loaded, routeType: EApiRouteType.GET };

		it("admits under an Allow of every row, grants nothing by one id, and refuses under a Deny of one id", async () => {
			expect(await readType(unfilled, [allow(EVERY_ROW)])).toBe(ALLOWED);
			expect(await readType(unfilled, [allow(row("a"))])).toBe(IMPLICIT);
			expect(await readType(unfilled, [allow(EVERY_ROW), deny(row("a"))])).toBe(DENIED);
		});
	});

	describe("on an unloaded row route without the route parameter", () => {
		it("refuses under a Deny of one id, without the parameter or with an empty one, and grants nothing by an Allow of one id", async () => {
			const bare: IRequest = { action: `${NAMESPACE}:read`, routeType: EApiRouteType.GET };
			const empty: IRequest = { action: `${NAMESPACE}:read`, requestMetadata: { parameters: { id: "" } }, routeType: EApiRouteType.GET };

			for (const request of [bare, empty]) {
				expect(await readType(request, [allow(EVERY_ROW), deny(row("a"))])).toBe(DENIED);
				expect(await readType(request, [allow(EVERY_ROW), deny(row("a*"))])).toBe(DENIED);
				expect(await readType(request, [allow(row("a"))])).toBe(IMPLICIT);
				expect(await readType(request, [allow(EVERY_ROW)])).toBe(ALLOWED);
			}
		});
	});

	describe("through ApiAuthorizationSimulator", () => {
		const simulate = async (statements: ReadonlyArray<IApiPolicyStatement>, parameters?: Record<string, string>): Promise<EApiAuthorizationDecisionType | undefined> => {
			const runtime: ApiAuthorizationRuntime = new ApiAuthorizationRuntime(
				{} as never,
				{} as never,
				{} as never,
				{ resolve: vi.fn().mockResolvedValue({ attachments: [{ policyId: "identity", principalId: principal.id, principalType: principal.type }], boundaries: [] }) } as never,
				{ resolve: vi.fn().mockResolvedValue([{ document: { Statement: statements, Version: "2012-10-17" }, id: "identity", namespace: NAMESPACE, sourceType: EApiPolicySourceType.MANAGED, version: "1" }]) } as never,
				new ApiAuthorizationIamEngine(new ApiAuthorizationIamQueryPlanner()),
				undefined,
				undefined,
				{ resolve: vi.fn().mockResolvedValue({ driverType: "postgres", type: EApiAuthorizationIamDialect.POSTGRES }) } as never,
			);

			const decision = await new ApiAuthorizationSimulator(runtime).evaluate<EngineRouteBoundAnchorEntity>({
				action: "read",
				authorization: { defaultMode: EApiAuthorizationMode.IAM, policyNamespace: NAMESPACE, resourceDefinition: definition },
				entity: EngineRouteBoundAnchorEntity,
				principal,
				...(parameters === undefined ? {} : { requestMetadata: { parameters } }),
				routeType: EApiRouteType.GET,
			});

			return decision.trace.decisionType;
		};

		it("refuses a Deny of one id beside an Allow of every row without the parameter or with an empty one", async () => {
			expect(await simulate([allow(EVERY_ROW), deny(row("a"))])).toBe(DENIED);
			expect(await simulate([allow(EVERY_ROW), deny(row("a"))], { id: "" })).toBe(DENIED);
		});

		it("refuses exactly the named id with the parameter", async () => {
			expect(await simulate([allow(EVERY_ROW), deny(row("a"))], { id: "a" })).toBe(DENIED);
			expect(await simulate([allow(EVERY_ROW), deny(row("a"))], { id: "b" })).toBe(ALLOWED);
		});

		it("admits under an Allow of every row and grants nothing by an Allow of one id without the parameter", async () => {
			expect(await simulate([allow(EVERY_ROW)])).toBe(ALLOWED);
			expect(await simulate([allow(row("a"))])).toBe(IMPLICIT);
			expect(await simulate([allow(row("a"))], { id: "a" })).toBe(ALLOWED);
		});
	});

	describe("on a row route with a Deny NotResource and globs", () => {
		it("refuses every id but the named one under a Deny NotResource", async () => {
			expect(await readType(read("a"), [allow(EVERY_ROW), statement(EApiPolicyEffect.DENY, { NotResource: [row("a")] })])).toBe(ALLOWED);
			expect(await readType(read("b"), [allow(EVERY_ROW), statement(EApiPolicyEffect.DENY, { NotResource: [row("a")] })])).toBe(DENIED);
		});

		it("refuses the ids a Deny glob names and admits the others", async () => {
			expect(await readType(read("ab"), [allow(EVERY_ROW), deny(row("a*"))])).toBe(DENIED);
			expect(await readType(read("ba"), [allow(EVERY_ROW), deny(row("a*"))])).toBe(ALLOWED);
		});

		it("reads a path value with a glob character as literal text", async () => {
			expect(await readType(read("a*"), [allow(row("ab"))])).toBe(IMPLICIT);
			expect(await readType(read("a*"), [allow(EVERY_ROW), deny(row("ab"))])).toBe(ALLOWED);
			expect(await readType(read("a?"), [allow(row("a?"))])).toBe(ALLOWED);
		});
	});
});
