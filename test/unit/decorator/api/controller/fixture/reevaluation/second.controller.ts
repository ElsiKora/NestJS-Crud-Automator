import type * as LibraryModule from "../../../../../../../src/index";

import { library, REEVALUATION_ROUTES, ReevaluationItemEntity } from "./shared";

@library.ApiController<ReevaluationItemEntity>({ entity: ReevaluationItemEntity, path: "reevaluation/second", routes: REEVALUATION_ROUTES })
export class ReevaluationSecondController {
	public service!: LibraryModule.ApiServiceBase<ReevaluationItemEntity>;
}
