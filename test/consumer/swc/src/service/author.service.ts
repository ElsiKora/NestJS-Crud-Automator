import type { Repository } from "typeorm";

import { ApiService, ApiServiceBase } from "@elsikora/nestjs-crud-automator";
import { AuthorEntity } from "@entity/author.entity";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

@Injectable()
@ApiService({ entity: AuthorEntity })
export class AuthorService extends ApiServiceBase<AuthorEntity> {
	@InjectRepository(AuthorEntity)
	public readonly repository!: Repository<AuthorEntity>;
}
