import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase } from "../../../src/index";

import { RequestRelationIssuerEntity } from "./issuer.entity";

@Injectable()
@ApiService<RequestRelationIssuerEntity>({ entity: RequestRelationIssuerEntity })
export class RequestRelationIssuerService extends ApiServiceBase<RequestRelationIssuerEntity> {
	@InjectRepository(RequestRelationIssuerEntity)
	public readonly repository!: Repository<RequestRelationIssuerEntity>;
}
