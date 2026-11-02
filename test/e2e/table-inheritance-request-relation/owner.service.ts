import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase } from "../../../src/index";

import { RequestRelationOwnerEntity } from "./owner.entity";

@Injectable()
@ApiService<RequestRelationOwnerEntity>({ entity: RequestRelationOwnerEntity })
export class RequestRelationOwnerService extends ApiServiceBase<RequestRelationOwnerEntity> {
	@InjectRepository(RequestRelationOwnerEntity)
	public readonly repository!: Repository<RequestRelationOwnerEntity>;
}
