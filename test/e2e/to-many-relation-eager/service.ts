import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase } from "../../../src/index";

import { E2eEagerAuthorEntity, E2eEagerCommentEntity, E2eEagerPostEntity, E2eEagerTagEntity } from "./entity";

@Injectable()
@ApiService({ entity: E2eEagerAuthorEntity })
export class E2eEagerAuthorService extends ApiServiceBase<E2eEagerAuthorEntity> {
	@InjectRepository(E2eEagerAuthorEntity)
	public readonly repository!: Repository<E2eEagerAuthorEntity>;
}

@Injectable()
@ApiService({ entity: E2eEagerCommentEntity })
export class E2eEagerCommentService extends ApiServiceBase<E2eEagerCommentEntity> {
	@InjectRepository(E2eEagerCommentEntity)
	public readonly repository!: Repository<E2eEagerCommentEntity>;
}

@Injectable()
@ApiService({ entity: E2eEagerPostEntity })
export class E2eEagerPostService extends ApiServiceBase<E2eEagerPostEntity> {
	@InjectRepository(E2eEagerPostEntity)
	public readonly repository!: Repository<E2eEagerPostEntity>;
}

@Injectable()
@ApiService({ entity: E2eEagerTagEntity })
export class E2eEagerTagService extends ApiServiceBase<E2eEagerTagEntity> {
	@InjectRepository(E2eEagerTagEntity)
	public readonly repository!: Repository<E2eEagerTagEntity>;
}
