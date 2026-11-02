import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

import { ApiPropertyDescribe, ApiService, ApiServiceBase, EApiDtoType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../../../src/index";

import { SameNameAdminGuard } from "./guards";

@Entity("e2e_same_name_guarded_items")
export class SameNameGuardedEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "label", exampleValue: "label", format: EApiPropertyStringType.STRING, maxLength: 6, minLength: 1, pattern: "/^[a-z]+$/", type: EApiPropertyDescribeType.STRING })
	public label!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "secret", exampleValue: "secret", format: EApiPropertyStringType.STRING, maxLength: 6, minLength: 1, pattern: "/^[a-z]+$/", properties: { [EApiRouteType.GET]: { [EApiDtoType.RESPONSE]: { guard: { guards: SameNameAdminGuard } } } }, type: EApiPropertyDescribeType.STRING })
	public secret!: string;
}

@Injectable()
@ApiService({ entity: SameNameGuardedEntity })
export class SameNameGuardedService extends ApiServiceBase<SameNameGuardedEntity> {
	@InjectRepository(SameNameGuardedEntity)
	public readonly repository!: Repository<SameNameGuardedEntity>;
}
