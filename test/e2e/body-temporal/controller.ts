import { Inject } from "@nestjs/common";

import { ApiController, EApiRouteType } from "../../../src/index";

import { E2eBodyTemporalEventEntity } from "./entity";
import { E2eBodyTemporalEventService } from "./service";

@ApiController<E2eBodyTemporalEventEntity>({
	entity: E2eBodyTemporalEventEntity,
	name: "E2eBodyTemporalEvents",
	path: "body-temporal/events",
	routes: {
		[EApiRouteType.CREATE]: {},
		[EApiRouteType.DELETE]: {
			generation: { isEnabled: false },
		},
		[EApiRouteType.GET]: {},
		[EApiRouteType.GET_LIST]: {
			generation: { isEnabled: false },
		},
		[EApiRouteType.PARTIAL_UPDATE]: {},
		[EApiRouteType.UPDATE]: {},
	},
})
export class E2eBodyTemporalEventController {
	@Inject(E2eBodyTemporalEventService)
	public readonly service!: E2eBodyTemporalEventService;
}
