import type { IApiAuthorizationPolicySubscriberRule, IApiAuthorizationRuleContext } from "../../../dist/esm/index";

import { Injectable } from "@nestjs/common";

import { ApiAuthorizationPolicy, ApiAuthorizationPolicyBase } from "../../../dist/esm/index";

import { E2eEntity } from "./entity";

@Injectable()
@ApiAuthorizationPolicy({ entity: E2eEntity })
export class E2ePolicySubscriber extends ApiAuthorizationPolicyBase<E2eEntity> {
	public static events: Array<string> = [];

	public static reset(): void {
		E2ePolicySubscriber.events = [];
	}

	private static record(action: string): void {
		E2ePolicySubscriber.events.push(`policy:before:${action}`);
	}

	private static transformIfRequested(result: E2eEntity, context: IApiAuthorizationRuleContext<E2eEntity>): E2eEntity {
		const attributes = context.subject.attributes as { applyPolicyTransform?: boolean } | undefined;

		if (!attributes?.applyPolicyTransform) {
			return result;
		}

		return {
			...result,
			policyPermissions: context.subject.permissions,
			policySubjectId: context.subject.id,
		};
	}

	private allowAdmin(): Array<IApiAuthorizationPolicySubscriberRule<E2eEntity, unknown>> {
		return this.allowForRoles(["admin"], {
			scope: ({ subject }) => ({
				where: {
					ownerId: subject.id,
				},
			}),
		});
	}

	public onBeforeCreate() {
		E2ePolicySubscriber.record("create");
		return this.allowAdmin();
	}

	public onBeforeDelete() {
		E2ePolicySubscriber.record("delete");
		return this.allowAdmin();
	}

	public onBeforeGet() {
		E2ePolicySubscriber.record("get");
		return this.allowForRoles(["admin"], {
			resultTransform: E2ePolicySubscriber.transformIfRequested,
			scope: ({ subject }) => ({
				where: {
					ownerId: subject.id,
				},
			}),
		});
	}

	public onBeforeGetList() {
		E2ePolicySubscriber.record("getList");
		return this.allowAdmin();
	}

	public onBeforePartialUpdate() {
		E2ePolicySubscriber.record("partialUpdate");
		return this.allowAdmin();
	}

	public onBeforeUpdate() {
		E2ePolicySubscriber.record("update");
		return this.allowAdmin();
	}

	public getCustomActionRule(action: "promote"): Array<IApiAuthorizationPolicySubscriberRule<E2eEntity, unknown>> {
		if (action === "promote") {
			E2ePolicySubscriber.record("promote");
			return this.allowAdmin();
		}

		return [];
	}
}
