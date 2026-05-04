import { Injectable } from "@nestjs/common";

import { ApiAuthorizationPolicy, ApiAuthorizationPolicyBase } from "../../../../src/index";

import { E2eOwnerEntity } from "./entity";

@Injectable()
@ApiAuthorizationPolicy({ entity: E2eOwnerEntity })
export class E2eOwnerPolicySubscriber extends ApiAuthorizationPolicyBase<E2eOwnerEntity> {
	public onBeforeDelete() {
		return this.allowForRoles(["admin"]);
	}
}
