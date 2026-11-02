import { Inject, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ApiController, EApiAuthenticationType, EApiRouteType } from "../../../../src/index";

import { SameNameGuardedEntity, SameNameGuardedService } from "./entity";
import { SameNameAdminGuard, SameNamePublicGuard } from "./guards";

@ApiController<SameNameGuardedEntity>({
	entity: SameNameGuardedEntity,
	path: "same-name-guarded-staff",
	routes: {
		[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { security: { authentication: { guard: SameNameAdminGuard, type: EApiAuthenticationType.USER } } },
		[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
})
export class SameNameGuardedStaffController {
	@Inject(SameNameGuardedService)
	public readonly service!: SameNameGuardedService;
}

@ApiController<SameNameGuardedEntity>({
	entity: SameNameGuardedEntity,
	path: "same-name-guarded-guest",
	routes: {
		[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { security: { authentication: { guard: SameNamePublicGuard, type: EApiAuthenticationType.USER } } },
		[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
})
export class SameNameGuardedGuestController {
	@Inject(SameNameGuardedService)
	public readonly service!: SameNameGuardedService;
}

@Module({
	controllers: [SameNameGuardedGuestController, SameNameGuardedStaffController],
	imports: [TypeOrmModule.forFeature([SameNameGuardedEntity])],
	providers: [SameNameGuardedService],
})
export class SameNameGuardedDifferentControllersModule {}
