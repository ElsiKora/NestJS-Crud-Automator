import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase, ApiServiceObservable, EApiFunctionTransactionMode, EApiFunctionType, EApiFunctionUpdatePersistenceMode } from "../../../src/index";

import { E2eRelationWriteNoteEntity, E2eRelationWritePostEntity, E2eRelationWriteStampEntity } from "./entity";

@Injectable()
@ApiService({ entity: E2eRelationWritePostEntity })
export class E2eRelationWritePostService extends ApiServiceBase<E2eRelationWritePostEntity> {
	@InjectRepository(E2eRelationWritePostEntity)
	public readonly repository!: Repository<E2eRelationWritePostEntity>;
}

@Injectable()
@ApiService({ entity: E2eRelationWriteNoteEntity })
@ApiServiceObservable()
export class E2eRelationWriteNoteService extends ApiServiceBase<E2eRelationWriteNoteEntity> {
	@InjectRepository(E2eRelationWriteNoteEntity)
	public readonly repository!: Repository<E2eRelationWriteNoteEntity>;
}

@Injectable()
@ApiService({
	entity: E2eRelationWriteNoteEntity,
	functions: { [EApiFunctionType.UPDATE]: { persistenceMode: EApiFunctionUpdatePersistenceMode.PATCH, transaction: { mode: EApiFunctionTransactionMode.REQUIRED } } },
})
@ApiServiceObservable()
export class E2eRelationWriteNotePatchService extends ApiServiceBase<E2eRelationWriteNoteEntity> {
	@InjectRepository(E2eRelationWriteNoteEntity)
	public readonly repository!: Repository<E2eRelationWriteNoteEntity>;
}

@Injectable()
@ApiService({
	entity: E2eRelationWriteStampEntity,
	functions: { [EApiFunctionType.UPDATE]: { persistenceMode: EApiFunctionUpdatePersistenceMode.PATCH, transaction: { mode: EApiFunctionTransactionMode.REQUIRED } } },
})
export class E2eRelationWriteStampService extends ApiServiceBase<E2eRelationWriteStampEntity> {
	@InjectRepository(E2eRelationWriteStampEntity)
	public readonly repository!: Repository<E2eRelationWriteStampEntity>;
}
