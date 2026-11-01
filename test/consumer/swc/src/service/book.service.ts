import type { Repository } from "typeorm";

import { ApiService, ApiServiceBase } from "@elsikora/nestjs-crud-automator";
import { BookEntity } from "@entity/book.entity";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

@Injectable()
@ApiService({ entity: BookEntity })
export class BookService extends ApiServiceBase<BookEntity> {
	@InjectRepository(BookEntity)
	public readonly repository!: Repository<BookEntity>;
}
