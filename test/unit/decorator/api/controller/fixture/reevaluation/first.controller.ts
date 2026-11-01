import type * as LibraryModule from "../../../../../../../src/index";

import { library, REEVALUATION_ROUTES, ReevaluationItemEntity } from "./shared";

@library.ApiController<ReevaluationItemEntity>({ entity: ReevaluationItemEntity, path: "reevaluation/first", routes: REEVALUATION_ROUTES })
export class ReevaluationFirstController {
	public service!: LibraryModule.ApiServiceBase<ReevaluationItemEntity>;
}
