import { Inject } from "@nestjs/common";

import { ApiController } from "../../../src/index";

import { E2eDtoNameRecordEntity } from "./record.entity";
import { E2eDtoNameRecordService } from "./record.service";

@ApiController<E2eDtoNameRecordEntity>({
	entity: E2eDtoNameRecordEntity,
	name: "E2eDtoNameRecords",
	path: "dto-name-records",
	routes: {},
})
export class E2eDtoNameRecordController {
	@Inject(E2eDtoNameRecordService)
	public readonly service!: E2eDtoNameRecordService;
}
