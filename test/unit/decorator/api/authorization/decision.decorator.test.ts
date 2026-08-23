import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationDecision } from "@interface/class/api/authorization/decision";
import type { IApiAuthorizationPrincipal } from "@interface/class/api/authorization/principal";
import type { ExecutionContext } from "@nestjs/common";

import { AUTHORIZATION_DECISION_METADATA_CONSTANT } from "@constant/class/authorization";
import { ApiAuthorizationDecision } from "@decorator/api";
import { EApiAuthorizationDecisionType, EApiAuthorizationMode, EApiAuthorizationPrincipalType, EApiPolicyEffect } from "@enum/class/authorization";
import { ForbiddenException } from "@nestjs/common";
import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";

class DecisionEntity implements IApiBaseEntity {
	public id?: string;
}

type TDecisionResult = {
	readonly count: number;
};

const principal: IApiAuthorizationPrincipal = {
	attributes: {},
	id: "decision-user",
	roles: [],
	type: EApiAuthorizationPrincipalType.USER,
};

const decision: IApiAuthorizationDecision<DecisionEntity, TDecisionResult> = {
	action: "decision.read",
	appliedRules: [],
	effect: EApiPolicyEffect.ALLOW,
	mode: EApiAuthorizationMode.IAM,
	permissions: ["decision.read"],
	policyId: "decision-policy",
	policyIds: ["decision-policy"],
	principal,
	resourceType: DecisionEntity.name,
	trace: {
		decisionType: EApiAuthorizationDecisionType.EXPLICIT_ALLOW,
		mode: EApiAuthorizationMode.IAM,
		permissions: ["decision.read"],
	},
	transforms: [],
};

class DecisionController {
	public handle(@ApiAuthorizationDecision<DecisionEntity>() _authorizationDecision: IApiAuthorizationDecision<DecisionEntity>): void {}
}

describe("ApiAuthorizationDecision", () => {
	it("injects the exact decision attached under the canonical request key", () => {
		const parameterMetadata = resolveParameterMetadata();
		const context = createExecutionContext({
			[AUTHORIZATION_DECISION_METADATA_CONSTANT.REQUEST_KEY]: decision,
			user: principal,
		});

		expect(parameterMetadata.index).toBe(0);
		expect(parameterMetadata.data).toBeUndefined();
		expect(parameterMetadata.pipes).toEqual([]);
		expect(parameterMetadata.factory(undefined, context)).toBe(decision);
	});

	it("fails closed when the authorization guard did not attach a decision", () => {
		const parameterMetadata = resolveParameterMetadata();
		const context = createExecutionContext({ user: principal });

		try {
			parameterMetadata.factory(undefined, context);
		} catch (error: unknown) {
			expect(error).toBeInstanceOf(ForbiddenException);
			expect((error as ForbiddenException).getStatus()).toBe(403);

			return;
		}

		throw new Error("ApiAuthorizationDecision accepted a request without a decision");
	});
});

function createExecutionContext(request: unknown): ExecutionContext {
	return {
		switchToHttp: () => ({
			getNext: () => undefined,
			getRequest: () => request,
			getResponse: () => undefined,
		}),
	} as ExecutionContext;
}

function resolveParameterMetadata(): {
	readonly data: unknown;
	readonly factory: (data: unknown, context: ExecutionContext) => unknown;
	readonly index: number;
	readonly pipes: ReadonlyArray<unknown>;
} {
	const routeArguments = Reflect.getMetadata(ROUTE_ARGS_METADATA, DecisionController, "handle") as Record<
		string,
		{
			readonly data: unknown;
			readonly factory: (data: unknown, context: ExecutionContext) => unknown;
			readonly index: number;
			readonly pipes: ReadonlyArray<unknown>;
		}
	>;
	const parameterMetadata = Object.values(routeArguments)[0];

	if (!parameterMetadata) {
		throw new Error("ApiAuthorizationDecision route argument metadata is missing");
	}

	return parameterMetadata;
}
