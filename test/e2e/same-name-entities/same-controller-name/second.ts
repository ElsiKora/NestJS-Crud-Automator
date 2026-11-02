import type { Repository } from "typeorm";

import { Inject, Injectable, Module } from "@nestjs/common";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

import { ApiController, ApiPropertyDescribe, ApiService, ApiServiceBase, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../../../src/index";

// Both modules declare an entity and a controller class with these names on purpose.
@Entity("e2e_same_name_twins_second")
export class SameNameTwinEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "second id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "second beta", exampleValue: "beta", format: EApiPropertyStringType.STRING, maxLength: 6, minLength: 1, pattern: "/^[a-z]+$/", type: EApiPropertyDescribeType.STRING })
	public beta!: string;
}

@Injectable()
@ApiService({ entity: SameNameTwinEntity })
export class SameNameTwinSecondService extends ApiServiceBase<SameNameTwinEntity> {
	@InjectRepository(SameNameTwinEntity)
	public readonly repository!: Repository<SameNameTwinEntity>;
}

@ApiController<SameNameTwinEntity>({
	entity: SameNameTwinEntity,
	path: "same-name-twins-second",
	routes: {
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
})
export class SameNameTwinController {
	@Inject(SameNameTwinSecondService)
	public readonly service!: SameNameTwinSecondService;
}

@Module({
	controllers: [SameNameTwinController],
	imports: [TypeOrmModule.forFeature([SameNameTwinEntity])],
	providers: [SameNameTwinSecondService],
})
export class SameNameTwinSecondModule {}
