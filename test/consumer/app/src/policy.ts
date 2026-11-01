import type { IApiAuthorizationPolicySubscriberRule, IApiAuthorizationRuleContext } from "@elsikora/nestjs-crud-automator";

import { ApiAuthorizationPolicy, ApiAuthorizationPolicyBase } from "@elsikora/nestjs-crud-automator";
import { Injectable } from "@nestjs/common";

import { SmokeItemEntity } from "./entity.js";

const MEMBER_ROLES: Array<string> = ["member"];

/**
 * HOOKS policy: members reach only the items of the owner whose id is their principal id.
 */
@Injectable()
@ApiAuthorizationPolicy({ entity: SmokeItemEntity })
export class SmokeItemPolicy extends ApiAuthorizationPolicyBase<SmokeItemEntity> {
	private readonly ownerScope = (context: IApiAuthorizationRuleContext<SmokeItemEntity>): { where: { ownerId: string } } => ({ where: { ownerId: context.principal.id } });

	public onBeforeCreate(): Array<IApiAuthorizationPolicySubscriberRule<SmokeItemEntity, unknown>> {
		return this.allowForRoles(MEMBER_ROLES);
	}

	public onBeforeDelete(): Array<IApiAuthorizationPolicySubscriberRule<SmokeItemEntity, unknown>> {
		return this.allowForRoles(MEMBER_ROLES, { scope: this.ownerScope });
	}

	public onBeforeGet(): Array<IApiAuthorizationPolicySubscriberRule<SmokeItemEntity, unknown>> {
		return this.allowForRoles(MEMBER_ROLES, { scope: this.ownerScope });
	}

	public onBeforeGetList(): Array<IApiAuthorizationPolicySubscriberRule<SmokeItemEntity, unknown>> {
		return this.allowForRoles(MEMBER_ROLES, { scope: this.ownerScope });
	}

	public onBeforePartialUpdate(): Array<IApiAuthorizationPolicySubscriberRule<SmokeItemEntity, unknown>> {
		return this.allowForRoles(MEMBER_ROLES, { scope: this.ownerScope });
	}
}
