import { Injectable } from "@nestjs/common";

import { ApiAuthorizationPolicy, ApiAuthorizationPolicyBase } from "../../../src/index";

import { E2eListHiddenItemEntity } from "./entity";

@Injectable()
@ApiAuthorizationPolicy({ entity: E2eListHiddenItemEntity })
export class E2eListHiddenItemPolicy extends ApiAuthorizationPolicyBase<E2eListHiddenItemEntity> {
	public onBeforeGetList() {
		return this.allow();
	}
}
