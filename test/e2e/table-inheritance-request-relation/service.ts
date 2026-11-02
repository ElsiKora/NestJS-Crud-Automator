import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase } from "../../../src/index";

import { RequestRelationDetailEntity } from "./root.entity";

@Injectable()
@ApiService<RequestRelationDetailEntity>({ entity: RequestRelationDetailEntity })
export class RequestRelationDetailService extends ApiServiceBase<RequestRelationDetailEntity> {
	@InjectRepository(RequestRelationDetailEntity)
	public readonly repository!: Repository<RequestRelationDetailEntity>;
}
