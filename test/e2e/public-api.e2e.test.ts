import "reflect-metadata";

import type {
	IApiAuthorizationModuleOptions,
	IApiAuthorizationRequestMetadata,
	IApiAuthorizationRuleContext,
	IApiAuthorizationScope,
	IApiAuthorizationSubject,
	IApiAuthorizationSubjectResolver,
	TApiAuthorizationPolicyBeforeCreateContext,
	TApiAuthorizationPolicyBeforeCreateResult,
	TApiAuthorizationPolicyBeforeGetContext,
	TApiAuthorizationPolicyBeforeGetListContext,
	TApiAuthorizationPolicyBeforeGetListResult,
	TApiAuthorizationPolicyBeforeGetResult,
	TApiAuthorizationPolicyBeforePartialUpdateContext,
	TApiAuthorizationPolicyBeforePartialUpdateResult,
} from "../../dist/esm/index";

import { ApiAuthorizationPolicy, ApiAuthorizationPolicyBase, AUTHORIZATION_SUBJECT_RESOLVER_TOKEN } from "../../dist/esm/index";
import { describe, expect, it } from "vitest";

class PublicApiUser {
	public id!: string;

	public operator?: { id: string };

	public role?: string;
}

class PublicApiSubjectResolver implements IApiAuthorizationSubjectResolver {
	public resolve(user: unknown): IApiAuthorizationSubject {
		const record: { id?: string; operatorId?: string } = typeof user === "object" && user !== null ? (user as { id?: string; operatorId?: string }) : {};

		return {
			attributes: {
				operatorId: record.operatorId,
			},
			id: record.id ?? "anonymous",
			permissions: ["admin.user.create", "admin.user.list", "admin.user.read", "admin.user.update"],
			roles: ["platform-admin"],
		};
	}
}

@ApiAuthorizationPolicy<PublicApiUser>({ entity: PublicApiUser })
class PublicApiPolicy extends ApiAuthorizationPolicyBase<PublicApiUser> {
	public onBeforeCreate(context: TApiAuthorizationPolicyBeforeCreateContext<PublicApiUser>): TApiAuthorizationPolicyBeforeCreateResult<PublicApiUser> {
		return [
			...this.denyForPermissions(["admin.user.create"], {
				condition: () => context.body.role === "platform-admin",
				priority: 1000,
			}),
			...this.allowForPermissions(["admin.user.create"]),
		];
	}

	public onBeforeGet(_context: TApiAuthorizationPolicyBeforeGetContext<PublicApiUser>): TApiAuthorizationPolicyBeforeGetResult<PublicApiUser> {
		return [
			...this.allowForPermissions(["admin.user.read"], {
				scope: (ruleContext: IApiAuthorizationRuleContext<PublicApiUser>): IApiAuthorizationScope<PublicApiUser> => this.scopeToOperator(ruleContext),
			}),
		];
	}

	public onBeforeGetList(_context: TApiAuthorizationPolicyBeforeGetListContext<PublicApiUser>): TApiAuthorizationPolicyBeforeGetListResult<PublicApiUser> {
		return [
			...this.allowForPermissions(["admin.user.list"]),
		];
	}

	public onBeforePartialUpdate(context: TApiAuthorizationPolicyBeforePartialUpdateContext<PublicApiUser>): TApiAuthorizationPolicyBeforePartialUpdateResult<PublicApiUser> {
		return [
			...this.denyForPermissions(["admin.user.update"], {
				condition: () => context.body.role === "platform-admin",
				priority: 1000,
			}),
			...this.allowForPermissions(["admin.user.update"]),
		];
	}

	private scopeToOperator(ruleContext: IApiAuthorizationRuleContext<PublicApiUser>): IApiAuthorizationScope<PublicApiUser> {
		const operatorId: unknown = ruleContext.subject.attributes?.operatorId;

		if (typeof operatorId !== "string" || operatorId.length === 0) {
			throw new TypeError("operatorId is required");
		}

		return {
			where: {
				operator: {
					id: operatorId,
				},
			},
		};
	}
}

describe("public authorization API (E2E)", () => {
	it("keeps payload-aware authorization types available from built dist", async () => {
		const subjectResolver: IApiAuthorizationSubjectResolver = new PublicApiSubjectResolver();
		const moduleOptions: IApiAuthorizationModuleOptions = {
			subjectResolver,
		};
		const requestMetadata: IApiAuthorizationRequestMetadata<PublicApiUser> = {
			body: {
				role: "operator-user",
			},
			headers: {
				"x-request-id": "req-1",
			},
			ip: "127.0.0.1",
			parameters: {
				id: "user-1",
			},
		};
		const resolvedSubject: IApiAuthorizationSubject = await Promise.resolve(subjectResolver.resolve({
			id: "user-1",
			operatorId: "operator-1",
		}));

		expect(moduleOptions.subjectResolver).toBe(subjectResolver);
		expect(requestMetadata.body).toEqual({ role: "operator-user" });
		expect(requestMetadata.parameters).toEqual({ id: "user-1" });
		expect(AUTHORIZATION_SUBJECT_RESOLVER_TOKEN).toBe("API_AUTHORIZATION_SUBJECT_RESOLVER");
		expect(resolvedSubject.id).toBe("user-1");
		expect(new PublicApiPolicy()).toBeInstanceOf(ApiAuthorizationPolicyBase);
	});
});
