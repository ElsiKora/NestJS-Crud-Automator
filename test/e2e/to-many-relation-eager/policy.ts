import { Injectable } from "@nestjs/common";

import { ApiAuthorizationPolicy, ApiAuthorizationPolicyBase } from "../../../src/index";

import { E2eEagerPostEntity } from "./entity";

@Injectable()
@ApiAuthorizationPolicy({ entity: E2eEagerPostEntity })
export class E2eEagerPostPolicySubscriber extends ApiAuthorizationPolicyBase<E2eEagerPostEntity> {
	public onBeforeCreate() {
		return this.scopeToOwner("ownerId");
	}

	public onBeforeGet() {
		return this.scopeToOwner("ownerId");
	}

	public onBeforeGetList() {
		return this.scopeToOwner("ownerId");
	}

	public onBeforePartialUpdate() {
		return this.scopeToOwner("ownerId");
	}

	public onBeforeUpdate() {
		return this.scopeToOwner("ownerId");
	}
}
