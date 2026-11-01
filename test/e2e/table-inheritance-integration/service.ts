import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase, ApiServiceObservable } from "../../../src/index";

import { IntegrationDetailEntity } from "./root.entity";

@ApiService<IntegrationDetailEntity>({ entity: IntegrationDetailEntity })
@ApiServiceObservable()
@Injectable()
export class IntegrationDetailService extends ApiServiceBase<IntegrationDetailEntity> {
	@InjectRepository(IntegrationDetailEntity)
	public readonly repository!: Repository<IntegrationDetailEntity>;
}
