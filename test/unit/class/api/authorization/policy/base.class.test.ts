import type { IApiAuthorizationPolicySubscriberRule } from "@interface/class/api/authorization/policy/subscriber";
import type { IApiAuthorizationRuleContext } from "@interface/class/api/authorization/rule/context.interface";
import type { TApiAuthorizationPolicyBeforeCreateResult } from "@type/class/api/authorization/policy/before/create-result.type";
import type { TApiAuthorizationPolicyBeforePartialUpdateResult } from "@type/class/api/authorization/policy/before/partial-update-result.type";

import { ApiAuthorizationPolicyBase } from "@class/api/authorization/policy/base.class";
import { EApiAuthorizationPermissionMatch, EApiAuthorizationPrincipalType, EApiPolicyEffect } from "@enum/class/authorization";
import { describe, expect, it, vi } from "vitest";

class PolicyEntity {
	public ownerId?: string;
	public owner?: { id?: string };
}

class TestPolicy extends ApiAuthorizationPolicyBase<PolicyEntity> {
	public typedBeforeCreateResult(): TApiAuthorizationPolicyBeforeCreateResult<PolicyEntity> {
		return [
			...this.allow(),
			...this.allowForPermissions(["admin.user.create"]),
			...this.allowForRoles(["admin"]),
			...this.scopeToOwner(),
		];
	}

	public typedBeforePartialUpdateResult(): TApiAuthorizationPolicyBeforePartialUpdateResult<PolicyEntity> {
		return [
			...this.deny(),
			...this.denyForPermissions(["admin.user.update"], {
				condition: ({ principal }: IApiAuthorizationRuleContext<PolicyEntity>) => principal.id === "user-1",
			}),
			...this.allowForPermissions(["admin.user.update"], {
				resultTransform: async (result: PolicyEntity) => result,
			}),
		];
	}

	public allowRule() {
		return this.allow();
	}

	public denyRule() {
		return this.deny();
	}

	public allowForRolesRule(roles: Array<string>) {
		return this.allowForRoles(roles);
	}

	public allowForPermissionsRule(
		requiredPermissions: Array<string>,
		options: Omit<IApiAuthorizationPolicySubscriberRule<PolicyEntity, never>, "effect" | "resultTransform"> & { match?: EApiAuthorizationPermissionMatch; resultTransform?: never } = {},
	) {
		return this.allowForPermissions(requiredPermissions, options);
	}

	public denyForPermissionsRule(
		requiredPermissions: Array<string>,
		options: Omit<IApiAuthorizationPolicySubscriberRule<PolicyEntity, never>, "effect" | "resultTransform"> & { match?: EApiAuthorizationPermissionMatch; resultTransform?: never } = {},
	) {
		return this.denyForPermissions(requiredPermissions, options);
	}

	public denyForPermissionsRuleWithTransform<R>(
		requiredPermissions: Array<string>,
		options: Omit<IApiAuthorizationPolicySubscriberRule<PolicyEntity, R>, "effect" | "resultTransform"> & {
			match?: EApiAuthorizationPermissionMatch;
			resultTransform: NonNullable<IApiAuthorizationPolicySubscriberRule<PolicyEntity, R>["resultTransform"]>;
		},
	) {
		return this.denyForPermissions(requiredPermissions, options);
	}

	public scopeRule(field?: keyof PolicyEntity, options?: { isRelation?: boolean }) {
		return this.scopeToOwner(field, {}, options);
	}
}

describe("ApiAuthorizationPolicyBase", () => {
	it("builds allow and deny rules", () => {
		const policy = new TestPolicy();
		const allowRule = policy.allowRule()[0];
		const denyRule = policy.denyRule()[0];

		expect(allowRule?.effect).toBe(EApiPolicyEffect.ALLOW);
		expect(denyRule?.effect).toBe(EApiPolicyEffect.DENY);
	});

	it("creates allow rules for matching roles", () => {
		const policy = new TestPolicy();
		const rule = policy.allowForRolesRule(["admin"])[0];
		const context = {
			permissions: [],
			principal: { attributes: {}, id: "user-1", roles: ["admin"], type: EApiAuthorizationPrincipalType.USER },
		} as IApiAuthorizationRuleContext<PolicyEntity>;

		expect(rule?.effect).toBe(EApiPolicyEffect.ALLOW);
		expect(rule?.condition?.(context)).toBe(true);
	});

	it("creates allow rules for matching permissions", async () => {
		const policy = new TestPolicy();
		const rule = policy.allowForPermissionsRule(["admin.user.read"])[0];
		const context = {
			permissions: ["admin.user.*"],
			principal: { attributes: {}, id: "user-1", roles: [], type: EApiAuthorizationPrincipalType.USER },
		} as IApiAuthorizationRuleContext<PolicyEntity>;

		expect(rule?.effect).toBe(EApiPolicyEffect.ALLOW);
		await expect(rule?.condition?.(context)).resolves.toBe(true);
	});

	it("creates deny rules for matching permissions and preserves options", async () => {
		const policy = new TestPolicy();
		const resultTransform = vi.fn(async (result: PolicyEntity) => result);
		const scope = vi.fn(async () => ({ where: { ownerId: "user-1" } }));
		const condition = vi.fn(async ({ principal }: IApiAuthorizationRuleContext<PolicyEntity>) => principal.id === "user-1");
		const rule = policy.denyForPermissionsRuleWithTransform<PolicyEntity>(["admin.user.read", "admin.user.update"], {
			condition,
			description: "Deny matched admin updates",
			match: EApiAuthorizationPermissionMatch.ALL,
			priority: 9,
			resultTransform,
			scope,
		})[0];
		const context = {
			permissions: ["admin.user.*"],
			principal: { attributes: {}, id: "user-1", roles: [], type: EApiAuthorizationPrincipalType.USER },
		} as IApiAuthorizationRuleContext<PolicyEntity>;

		expect(rule?.description).toBe("Deny matched admin updates");
		expect(rule?.effect).toBe(EApiPolicyEffect.DENY);
		expect(rule?.priority).toBe(9);
		expect(rule?.resultTransform).toBe(resultTransform);
		expect(rule?.scope).toBe(scope);
		await expect(rule?.condition?.(context)).resolves.toBe(true);
		expect(condition).toHaveBeenCalledTimes(1);
	});

	it("scopes to owner based on relation or scalar fields", () => {
		const policy = new TestPolicy();
		const relationRule = policy.scopeRule("owner")[0];
		const scalarRule = policy.scopeRule("ownerId")[0];

		const context = {
			permissions: [],
			principal: { attributes: {}, id: "user-1", roles: [], type: EApiAuthorizationPrincipalType.USER },
		} as IApiAuthorizationRuleContext<PolicyEntity>;

		expect(relationRule?.scope?.(context)).toEqual({ where: { owner: { id: "user-1" } } });
		expect(scalarRule?.scope?.(context)).toEqual({ where: { ownerId: "user-1" } });
	});

	it("keeps helper return types compatible with route hook result aliases", () => {
		const policy = new TestPolicy();

		expect(policy.typedBeforeCreateResult()).toHaveLength(4);
		expect(policy.typedBeforePartialUpdateResult()).toHaveLength(3);
	});
});
