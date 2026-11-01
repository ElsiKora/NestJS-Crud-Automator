import type { Repository } from "typeorm";

import { ApiService, ApiServiceBase } from "@elsikora/nestjs-crud-automator";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { CycAuthorEntity } from "./author.entity.js";
import { CycBookEntity } from "./book.entity.js";

@Injectable()
@ApiService({ entity: CycAuthorEntity })
export class CycAuthorService extends ApiServiceBase<CycAuthorEntity> {
	@InjectRepository(CycAuthorEntity)
	public readonly repository!: Repository<CycAuthorEntity>;
}

@Injectable()
@ApiService({ entity: CycBookEntity })
export class CycBookService extends ApiServiceBase<CycBookEntity> {
	@InjectRepository(CycBookEntity)
	public readonly repository!: Repository<CycBookEntity>;
}
