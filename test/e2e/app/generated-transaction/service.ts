import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase, ApiServiceObservable, EApiFunctionTransactionMode, EApiFunctionType } from "../../../../src/index";

import { E2eEntity } from "../entity";

@Injectable()
@ApiServiceObservable()
@ApiService({
	entity: E2eEntity,
	functions: {
		[EApiFunctionType.CREATE]: {
			transaction: { mode: EApiFunctionTransactionMode.REQUIRED },
		},
	},
})
export class E2eGeneratedTransactionService extends ApiServiceBase<E2eEntity> {
	@InjectRepository(E2eEntity)
	public readonly repository!: Repository<E2eEntity>;
}
