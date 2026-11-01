import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase, ApiServiceObservable } from "../../../src/index";

import { PaymentDetailEntity } from "./root.entity";

@Injectable()
@ApiServiceObservable()
@ApiService<PaymentDetailEntity>({ entity: PaymentDetailEntity })
export class PaymentDetailService extends ApiServiceBase<PaymentDetailEntity> {
	@InjectRepository(PaymentDetailEntity)
	public readonly repository!: Repository<PaymentDetailEntity>;
}
