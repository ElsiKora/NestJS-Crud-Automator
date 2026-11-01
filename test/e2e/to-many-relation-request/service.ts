import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase } from "../../../src/index";

import { E2eHydrationAttachmentEntity, E2eHydrationDetailEntity, E2eHydrationNoteEntity, E2eHydrationOwnerEntity, E2eHydrationPostEntity, E2eHydrationTagEntity } from "./entity";

@Injectable()
@ApiService({ entity: E2eHydrationAttachmentEntity })
export class E2eHydrationAttachmentService extends ApiServiceBase<E2eHydrationAttachmentEntity> {
	@InjectRepository(E2eHydrationAttachmentEntity)
	public readonly repository!: Repository<E2eHydrationAttachmentEntity>;
}

@Injectable()
@ApiService({ entity: E2eHydrationDetailEntity })
export class E2eHydrationDetailService extends ApiServiceBase<E2eHydrationDetailEntity> {
	@InjectRepository(E2eHydrationDetailEntity)
	public readonly repository!: Repository<E2eHydrationDetailEntity>;
}

@Injectable()
@ApiService({ entity: E2eHydrationNoteEntity })
export class E2eHydrationNoteService extends ApiServiceBase<E2eHydrationNoteEntity> {
	@InjectRepository(E2eHydrationNoteEntity)
	public readonly repository!: Repository<E2eHydrationNoteEntity>;
}

@Injectable()
@ApiService({ entity: E2eHydrationOwnerEntity })
export class E2eHydrationOwnerService extends ApiServiceBase<E2eHydrationOwnerEntity> {
	@InjectRepository(E2eHydrationOwnerEntity)
	public readonly repository!: Repository<E2eHydrationOwnerEntity>;
}

@Injectable()
@ApiService({ entity: E2eHydrationPostEntity })
export class E2eHydrationPostService extends ApiServiceBase<E2eHydrationPostEntity> {
	@InjectRepository(E2eHydrationPostEntity)
	public readonly repository!: Repository<E2eHydrationPostEntity>;
}

@Injectable()
@ApiService({ entity: E2eHydrationTagEntity })
export class E2eHydrationTagService extends ApiServiceBase<E2eHydrationTagEntity> {
	@InjectRepository(E2eHydrationTagEntity)
	public readonly repository!: Repository<E2eHydrationTagEntity>;
}
