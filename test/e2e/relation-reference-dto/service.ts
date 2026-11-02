import type { Repository } from "typeorm";

import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { ApiService, ApiServiceBase } from "../../../src/index";

import { E2eRelationReferenceIntegerPostEntity, E2eRelationReferenceObjectCodePostEntity, E2eRelationReferenceScalarCodePostEntity, E2eRelationReferenceScalarIdPostEntity } from "./entity";

@Injectable()
@ApiService({ entity: E2eRelationReferenceScalarIdPostEntity })
export class E2eRelationReferenceScalarIdPostService extends ApiServiceBase<E2eRelationReferenceScalarIdPostEntity> {
	@InjectRepository(E2eRelationReferenceScalarIdPostEntity)
	public readonly repository!: Repository<E2eRelationReferenceScalarIdPostEntity>;
}

@Injectable()
@ApiService({ entity: E2eRelationReferenceScalarCodePostEntity })
export class E2eRelationReferenceScalarCodePostService extends ApiServiceBase<E2eRelationReferenceScalarCodePostEntity> {
	@InjectRepository(E2eRelationReferenceScalarCodePostEntity)
	public readonly repository!: Repository<E2eRelationReferenceScalarCodePostEntity>;
}

@Injectable()
@ApiService({ entity: E2eRelationReferenceObjectCodePostEntity })
export class E2eRelationReferenceObjectCodePostService extends ApiServiceBase<E2eRelationReferenceObjectCodePostEntity> {
	@InjectRepository(E2eRelationReferenceObjectCodePostEntity)
	public readonly repository!: Repository<E2eRelationReferenceObjectCodePostEntity>;
}

@Injectable()
@ApiService({ entity: E2eRelationReferenceIntegerPostEntity })
export class E2eRelationReferenceIntegerPostService extends ApiServiceBase<E2eRelationReferenceIntegerPostEntity> {
	@InjectRepository(E2eRelationReferenceIntegerPostEntity)
	public readonly repository!: Repository<E2eRelationReferenceIntegerPostEntity>;
}
