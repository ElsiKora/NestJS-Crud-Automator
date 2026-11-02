import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase } from "../../../src/index";

import { E2eInheritedOrderRecordEntity } from "./record.entity";

@Injectable()
@ApiService({ entity: E2eInheritedOrderRecordEntity })
export class E2eInheritedOrderRecordService extends ApiServiceBase<E2eInheritedOrderRecordEntity> {
	@InjectRepository(E2eInheritedOrderRecordEntity)
	public readonly repository!: Repository<E2eInheritedOrderRecordEntity>;
}
