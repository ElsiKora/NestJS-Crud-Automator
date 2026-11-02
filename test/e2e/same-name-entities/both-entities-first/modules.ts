import type { Repository } from "typeorm";

import { Inject, Injectable, Module } from "@nestjs/common";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";

import { ApiController, ApiService, ApiServiceBase, EApiRouteType } from "../../../../src/index";

// Both entity files are imported before any controller is decorated, so each class must keep its own rules with the other one already registered.
import { SameNameRulesEntity as DigitEntity } from "./digit-entity";
import { SameNameRulesEntity as LowerEntity } from "./lower-entity";

const ROUTES: object = {
	[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
	[EApiRouteType.GET]: { generation: { isEnabled: false } },
	[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
	[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
	[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
};

@Injectable()
@ApiService<LowerEntity>({ entity: LowerEntity })
class SameNameRulesLowerService extends ApiServiceBase<LowerEntity> {
	@InjectRepository(LowerEntity)
	public readonly repository!: Repository<LowerEntity>;
}

@ApiController<LowerEntity>({ entity: LowerEntity, path: "same-name-rules-lower", routes: ROUTES })
class SameNameRulesLowerController {
	@Inject(SameNameRulesLowerService)
	public readonly service!: SameNameRulesLowerService;
}

@Module({ controllers: [SameNameRulesLowerController], imports: [TypeOrmModule.forFeature([LowerEntity])], providers: [SameNameRulesLowerService] })
export class SameNameRulesLowerModule {}

@Injectable()
@ApiService<DigitEntity>({ entity: DigitEntity })
class SameNameRulesDigitService extends ApiServiceBase<DigitEntity> {
	@InjectRepository(DigitEntity)
	public readonly repository!: Repository<DigitEntity>;
}

@ApiController<DigitEntity>({ entity: DigitEntity, path: "same-name-rules-digit", routes: ROUTES })
class SameNameRulesDigitController {
	@Inject(SameNameRulesDigitService)
	public readonly service!: SameNameRulesDigitService;
}

@Module({ controllers: [SameNameRulesDigitController], imports: [TypeOrmModule.forFeature([DigitEntity])], providers: [SameNameRulesDigitService] })
export class SameNameRulesDigitModule {}

export { DigitEntity as SameNameRulesDigitEntity, LowerEntity as SameNameRulesLowerEntity };
