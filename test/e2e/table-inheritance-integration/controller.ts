import type { IntegrationDetailCardEntity } from "./card.entity";

import { Inject } from "@nestjs/common";

import { ApiController, ApiControllerObservable, ApiControllerSecurable, EApiAuthenticationType, EApiControllerGetListQueryPaginationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRelationReferenceShape, EApiControllerRequestTarget, EApiRouteType, EFilterOrderDirection } from "../../../src/index";
import { TestAuthGuard } from "../app/auth-guard";

import { integrationDetailAuthorization } from "./iam";
import { IntegrationDetailEntity } from "./root.entity";
import { IntegrationDetailService } from "./service";

import "./card.entity";
import "./form.entity";

const disabledRoute = { generation: { isEnabled: false } } as const;
const security = { authentication: { guard: TestAuthGuard, type: EApiAuthenticationType.USER } };
const relations = { response: { load: { include: { issuer: true } }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.OBJECT } } } as const;

@ApiController<IntegrationDetailEntity & Partial<IntegrationDetailCardEntity>>({
	authorization: integrationDetailAuthorization,
	entity: IntegrationDetailEntity,
	name: "IntegrationDetail",
	path: "sti-integration-details",
	routes: {
		[EApiRouteType.CREATE]: disabledRoute,
		[EApiRouteType.DELETE]: disabledRoute,
		[EApiRouteType.GET]: { relations, security },
		[EApiRouteType.GET_LIST]: {
			relations,
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					order: {
						defaultOrder: [{ direction: EFilterOrderDirection.ASC, field: "rank" }],
						fields: { rank: { isEnabled: true } },
						tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }],
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
					pagination: { mode: EApiControllerGetListQueryPaginationMode.PAGE },
				},
			},
			security,
		},
		[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
		[EApiRouteType.UPDATE]: disabledRoute,
	},
})
@ApiControllerObservable()
@ApiControllerSecurable()
export class IntegrationDetailController {
	@Inject(IntegrationDetailService)
	public readonly service!: IntegrationDetailService;
}
