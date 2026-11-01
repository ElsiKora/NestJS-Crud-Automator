import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase, ApiServiceObservable } from "../../../src/index";

import { PaymentDetailFormFieldEntity } from "./form-field.entity";

@Injectable()
@ApiServiceObservable()
@ApiService<PaymentDetailFormFieldEntity>({ entity: PaymentDetailFormFieldEntity })
export class PaymentDetailFormFieldService extends ApiServiceBase<PaymentDetailFormFieldEntity> {
	@InjectRepository(PaymentDetailFormFieldEntity)
	public readonly repository!: Repository<PaymentDetailFormFieldEntity>;
}
