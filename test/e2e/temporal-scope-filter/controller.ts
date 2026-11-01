import { Inject } from "@nestjs/common";

import { ApiController, ApiControllerObservable, ApiControllerSecurable, EApiAuthenticationType, EApiAuthorizationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiRouteType, EFilterOperation } from "../../../src/index";

import { TestAuthGuard } from "../app/auth-guard";

import { E2eTemporalStampService } from "./service";
import { E2eTemporalStampEntity } from "./stamp.entity";

const disabledRoute = { generation: { isEnabled: false } } as const;
const security = { authentication: { guard: TestAuthGuard, type: EApiAuthenticationType.USER } };

@ApiControllerObservable()
@ApiControllerSecurable()
@ApiController<E2eTemporalStampEntity>({
	authorization: { defaultMode: EApiAuthorizationMode.HOOKS },
	entity: E2eTemporalStampEntity,
	name: "E2eTemporalStamps",
	path: "temporal-stamps",
	routes: {
		[EApiRouteType.CREATE]: disabledRoute,
		[EApiRouteType.DELETE]: disabledRoute,
		[EApiRouteType.GET]: { security },
		[EApiRouteType.GET_LIST]: {
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					filter: { fields: { localStampedAt: { allowedOperations: [EFilterOperation.GTE], isEnabled: true }, stampedAt: { allowedOperations: [EFilterOperation.GTE, EFilterOperation.LT], isEnabled: true } }, unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT },
					order: { fields: { sequence: { isEnabled: true } }, unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT },
				},
			},
			security,
		},
		[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
		[EApiRouteType.UPDATE]: disabledRoute,
	},
})
export class E2eTemporalStampController {
	@Inject(E2eTemporalStampService)
	public readonly service!: E2eTemporalStampService;
}
