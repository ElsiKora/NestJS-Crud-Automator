import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase } from "../../../src/index";

import { E2eRenameMapItemEntity, E2eRenameMapRecordEntity } from "./entity";

@Injectable()
@ApiService({ entity: E2eRenameMapItemEntity })
export class E2eRenameMapItemService extends ApiServiceBase<E2eRenameMapItemEntity> {
	@InjectRepository(E2eRenameMapItemEntity)
	public readonly repository!: Repository<E2eRenameMapItemEntity>;
}

@Injectable()
@ApiService({ entity: E2eRenameMapRecordEntity })
export class E2eRenameMapRecordService extends ApiServiceBase<E2eRenameMapRecordEntity> {
	@InjectRepository(E2eRenameMapRecordEntity)
	public readonly repository!: Repository<E2eRenameMapRecordEntity>;
}
