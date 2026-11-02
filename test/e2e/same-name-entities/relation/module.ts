import type { Repository } from "typeorm";

import { Inject, Injectable, Module } from "@nestjs/common";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";

import { ApiController, ApiService, ApiServiceBase, EApiRouteType } from "../../../../src/index";

import { SameNameRelationHolderEntity } from "./second";

@Injectable()
@ApiService<SameNameRelationHolderEntity>({ entity: SameNameRelationHolderEntity })
class SameNameRelationHolderService extends ApiServiceBase<SameNameRelationHolderEntity> {
	@InjectRepository(SameNameRelationHolderEntity)
	public readonly repository!: Repository<SameNameRelationHolderEntity>;
}

@ApiController<SameNameRelationHolderEntity>({
	entity: SameNameRelationHolderEntity,
	name: "SameNameRelationHolders",
	path: "same-name-relation-holders",
	routes: {
		[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
})
class SameNameRelationHolderController {
	@Inject(SameNameRelationHolderService)
	public readonly service!: SameNameRelationHolderService;
}

@Module({
	controllers: [SameNameRelationHolderController],
	imports: [TypeOrmModule.forFeature([SameNameRelationHolderEntity])],
	providers: [SameNameRelationHolderService],
})
export class SameNameRelationModule {}
