import { Injectable } from "@nestjs/common";
import { LessThan } from "typeorm";

import { ApiAuthorizationPolicy, ApiAuthorizationPolicyBase } from "../../../src/index";

import { E2eTemporalStampEntity } from "./stamp.entity";

// Rows stamped before this instant are visible; the bound sits on a historic second.
export const E2E_TEMPORAL_STAMP_SCOPE_LIMIT: string = "1800-06-01T12:00:05.000Z";

@Injectable()
@ApiAuthorizationPolicy({ entity: E2eTemporalStampEntity })
export class E2eTemporalStampPolicy extends ApiAuthorizationPolicyBase<E2eTemporalStampEntity> {
	private readonly scope = () => ({ where: { stampedAt: LessThan(new Date(E2E_TEMPORAL_STAMP_SCOPE_LIMIT)) } });

	public onBeforeGet() {
		return this.allow({ scope: this.scope });
	}

	public onBeforeGetList() {
		return this.allow({ scope: this.scope });
	}
}
