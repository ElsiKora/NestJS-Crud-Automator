import type { IApiAuthorizationRuleContext } from "../../../src/index";

import { Injectable } from "@nestjs/common";

import { ApiAuthorizationPolicy, ApiAuthorizationPolicyBase } from "../../../src/index";

import { PaymentDetailEntity } from "./root.entity";

@Injectable()
@ApiAuthorizationPolicy({ entity: PaymentDetailEntity })
export class PaymentDetailPolicy extends ApiAuthorizationPolicyBase<PaymentDetailEntity> {
	private readonly ownerScope = (context: IApiAuthorizationRuleContext<PaymentDetailEntity>) => ({ where: { ownerId: context.principal.id } });

	public onBeforeCreate() {
		return this.allow({ scope: this.ownerScope });
	}

	public onBeforeGet() {
		return this.allow({ scope: this.ownerScope });
	}

	public onBeforeGetList() {
		return this.allow({ scope: this.ownerScope });
	}
}
