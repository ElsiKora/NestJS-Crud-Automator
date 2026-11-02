import type { Repository } from "typeorm";

import { Inject, Injectable, Module } from "@nestjs/common";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";

import { ApiController, ApiService, ApiServiceBase, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiDtoType, EApiRouteType, EFilterOperation } from "../../../../src/index";

import { SameNameLateHolderEntity } from "./holder";

import "./owner";

const disabledRoutes = {
	[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
	[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
	[EApiRouteType.GET]: { generation: { isEnabled: false } },
	[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
	[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
} as const;

class SameNameLateQueryDto {
	public limit?: number;

	public page?: number;
}

@Injectable()
@ApiService<SameNameLateHolderEntity>({ entity: SameNameLateHolderEntity })
class SameNameLateHolderService extends ApiServiceBase<SameNameLateHolderEntity> {
	@InjectRepository(SameNameLateHolderEntity)
	public readonly repository!: Repository<SameNameLateHolderEntity>;
}

@ApiController<SameNameLateHolderEntity>({
	entity: SameNameLateHolderEntity,
	name: "SameNameLateTypedHolders",
	path: "same-name-late-typed-holders",
	routes: {
		...disabledRoutes,
		[EApiRouteType.GET_LIST]: { request: { [EApiControllerRequestTarget.QUERY]: { filter: { fields: { "owner.label": { allowedOperations: [EFilterOperation.EQ], isEnabled: true } }, unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT } } } },
	},
})
class SameNameLateTypedController {
	@Inject(SameNameLateHolderService)
	public readonly service!: SameNameLateHolderService;
}

@ApiController<SameNameLateHolderEntity>({
	entity: SameNameLateHolderEntity,
	name: "SameNameLateManualHolders",
	path: "same-name-late-manual-holders",
	routes: { ...disabledRoutes, [EApiRouteType.GET_LIST]: { dto: { [EApiDtoType.QUERY]: SameNameLateQueryDto } } },
})
class SameNameLateManualController {
	@Inject(SameNameLateHolderService)
	public readonly service!: SameNameLateHolderService;
}

@Module({
	controllers: [SameNameLateManualController, SameNameLateTypedController],
	imports: [TypeOrmModule.forFeature([SameNameLateHolderEntity])],
	providers: [SameNameLateHolderService],
})
export class SameNameLateModule {}
