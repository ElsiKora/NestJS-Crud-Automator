import type {
	IApiAuthorizationPolicySubscriberRule,
	IApiAuthorizationRuleContext,
	TApiAuthorizationPolicyBeforeCreateContext,
	TApiAuthorizationPolicyBeforeGetContext,
	TApiAuthorizationPolicyBeforeGetListContext,
	TApiAuthorizationPolicyBeforePartialUpdateContext,
	TApiAuthorizationPolicyBeforeUpdateContext,
} from "../../../dist/esm/index";

import { Injectable } from "@nestjs/common";

import { ApiAuthorizationPolicy, ApiAuthorizationPolicyBase, EAuthorizationPermissionMatch } from "../../../dist/esm/index";

import { E2eEntity } from "./entity";

type TE2ePolicySubjectAttributes = {
	applyPolicyTransform?: boolean;
	blockUpdate?: boolean;
	operatorId?: string;
};

type TE2eAuthorizedEntityPayload = {
	role?: string;
};

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
		const attributes = context.subject.attributes as TE2ePolicySubjectAttributes | undefined;

		if (!attributes?.applyPolicyTransform) {
			return result;
		}

		return {
			...result,
			policyPermissions: context.subject.permissions,
			policySubjectId: context.subject.id,
		};
	}

	private static shouldBlockUpdate(context: IApiAuthorizationRuleContext<E2eEntity>): boolean {
		const attributes = context.subject.attributes as TE2ePolicySubjectAttributes | undefined;

		return attributes?.blockUpdate === true;
	}

	private static assignsPlatformAdmin(body: TApiAuthorizationPolicyBeforePartialUpdateContext<E2eEntity>["body"] | TApiAuthorizationPolicyBeforeUpdateContext<E2eEntity>["body"]): boolean {
		const authorizedEntity = body.authorizedEntity as TE2eAuthorizedEntityPayload | undefined;

		return authorizedEntity?.role === "platform-admin";
	}

	private resolveScopedOwnerId(subject: IApiAuthorizationRuleContext<E2eEntity>["subject"]): string {
		const attributes = subject.attributes as TE2ePolicySubjectAttributes | undefined;

		return typeof attributes?.operatorId === "string" && attributes.operatorId.length > 0 ? attributes.operatorId : subject.id;
	}

	private shouldAllowRequestedOwner(subject: IApiAuthorizationRuleContext<E2eEntity>["subject"], ownerId: string | undefined): boolean {
		return ownerId === undefined || ownerId === this.resolveScopedOwnerId(subject);
	}

	private readonly ownerScope = (context: IApiAuthorizationRuleContext<E2eEntity>) => {
		return {
			where: {
				ownerId: this.resolveScopedOwnerId(context.subject),
			},
		};
	};

	private buildPayloadAwareDenyRules(context: TApiAuthorizationPolicyBeforePartialUpdateContext<E2eEntity> | TApiAuthorizationPolicyBeforeUpdateContext<E2eEntity>): Array<IApiAuthorizationPolicySubscriberRule<E2eEntity, unknown>> {
		const rules: Array<IApiAuthorizationPolicySubscriberRule<E2eEntity, unknown>> = [];

		if (!this.shouldAllowRequestedOwner(context.subject, context.body.ownerId)) {
			rules.push(
				...this.deny({
					description: "Policies can deny updates that attempt to move data outside the caller operator scope",
					priority: 200,
				}),
			);
		}

		if (E2ePolicySubscriber.assignsPlatformAdmin(context.body)) {
			rules.push(
				...this.deny({
					description: "Payload-aware policies deny attempts to assign platform-admin through update payloads",
					priority: 250,
				}),
			);
		}

		if (context.parameters.id === "payload-aware-denied" && context.body.name === "PayloadDenied") {
			rules.push(
				...this.deny({
					description: "Policies can deny using both route parameters and request body",
					priority: 300,
				}),
			);
		}

		return rules;
	}

	private allowAdminOrPermissions<R>(requiredPermissions: Array<string>, rule: Omit<IApiAuthorizationPolicySubscriberRule<E2eEntity, R>, "effect"> = {} as Omit<IApiAuthorizationPolicySubscriberRule<E2eEntity, R>, "effect">): Array<IApiAuthorizationPolicySubscriberRule<E2eEntity, R>> {
		return [
			...this.allowForRoles(["admin"], rule),
			...this.allowForPermissions(requiredPermissions, {
				...rule,
				match: EAuthorizationPermissionMatch.ANY,
			}),
		];
	}

	private allowAdminOrReadAllPermissions<R>(requiredPermissions: Array<string>, rule: Omit<IApiAuthorizationPolicySubscriberRule<E2eEntity, R>, "effect"> = {} as Omit<IApiAuthorizationPolicySubscriberRule<E2eEntity, R>, "effect">): Array<IApiAuthorizationPolicySubscriberRule<E2eEntity, R>> {
		return [
			...this.allowForRoles(["admin"], rule),
			...this.allowForPermissions(requiredPermissions, {
				...rule,
				match: EAuthorizationPermissionMatch.ALL,
			}),
		];
	}

	private allowAdminCreate(): Array<IApiAuthorizationPolicySubscriberRule<E2eEntity, unknown>> {
		return this.allowAdminOrPermissions(["admin.item.create"], {
			scope: this.ownerScope,
		});
	}

	public onBeforeCreate(context: TApiAuthorizationPolicyBeforeCreateContext<E2eEntity>) {
		E2ePolicySubscriber.record("create");

		if (context.body.name === "payload-aware-denied-create" || !this.shouldAllowRequestedOwner(context.subject, context.body.ownerId)) {
			return this.deny({
				description: "Policies can deny create requests using request body metadata",
				priority: 200,
			});
		}

		return this.allowAdminCreate();
	}

	public onBeforeDelete() {
		E2ePolicySubscriber.record("delete");
		return this.allowAdminOrPermissions(["admin.item.delete"], {
			scope: this.ownerScope,
		});
	}

	public onBeforeGet(context: TApiAuthorizationPolicyBeforeGetContext<E2eEntity>) {
		E2ePolicySubscriber.record("get");

		if (context.parameters.id === "payload-denied-get") {
			return this.deny({
				description: "Policies can deny using route parameters",
				priority: 200,
			});
		}

		return this.allowAdminOrPermissions(["admin.item.read"], {
			resultTransform: E2ePolicySubscriber.transformIfRequested,
			scope: this.ownerScope,
		});
	}

	public onBeforeGetList(context: TApiAuthorizationPolicyBeforeGetListContext<E2eEntity>) {
		E2ePolicySubscriber.record("getList");

		const forcePolicyDeny = (context.query as { forcePolicyDeny?: string }).forcePolicyDeny;

		if (forcePolicyDeny === "true") {
			return this.deny({
				description: "Policies can deny using request query metadata",
				priority: 200,
			});
		}

		return this.allowAdminOrReadAllPermissions(["admin.item.read", "admin.item.list"], {
			scope: this.ownerScope,
		});
	}

	public onBeforePartialUpdate(context: TApiAuthorizationPolicyBeforePartialUpdateContext<E2eEntity>) {
		E2ePolicySubscriber.record("partialUpdate");

		return [
			...this.buildPayloadAwareDenyRules(context),
			...this.allowAdminOrPermissions(["admin.item.update"], {
				scope: this.ownerScope,
			}),
		];
	}

	public onBeforeUpdate(context: TApiAuthorizationPolicyBeforeUpdateContext<E2eEntity>) {
		E2ePolicySubscriber.record("update");

		return [
			...this.buildPayloadAwareDenyRules(context),
			...this.denyForPermissions(["admin.item.update"], {
				condition: E2ePolicySubscriber.shouldBlockUpdate,
				description: "Blocked updates are denied even when another allow matches",
				priority: 100,
			}),
			...this.allowAdminOrPermissions(["admin.item.update"], {
				scope: this.ownerScope,
			}),
		];
	}

	public getCustomActionRule(action: "promote"): Array<IApiAuthorizationPolicySubscriberRule<E2eEntity, unknown>> {
		if (action === "promote") {
			E2ePolicySubscriber.record("promote");
			return this.allowAdminOrPermissions(["admin.item.promote"], {
				scope: this.ownerScope,
			});
		}

		return [];
	}
}
