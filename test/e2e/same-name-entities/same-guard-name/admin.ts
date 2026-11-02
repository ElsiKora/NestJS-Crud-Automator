import { Inject, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ApiController, EApiAuthenticationType, EApiRouteType } from "../../../../src/index";

import { SameNameGuardedEntity, SameNameGuardedService } from "./entity";
import { SameNameAdminGuard } from "./guards";

// Both modules declare a controller class with this name on purpose.
@ApiController<SameNameGuardedEntity>({
	entity: SameNameGuardedEntity,
	path: "same-name-guarded-admin",
	routes: {
		[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { security: { authentication: { guard: SameNameAdminGuard, type: EApiAuthenticationType.USER } } },
		[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
})
export class SameNameGuardedController {
	@Inject(SameNameGuardedService)
	public readonly service!: SameNameGuardedService;
}

@Module({
	controllers: [SameNameGuardedController],
	imports: [TypeOrmModule.forFeature([SameNameGuardedEntity])],
	providers: [SameNameGuardedService],
})
export class SameNameGuardedAdminModule {}
