import type { ArgumentMetadata } from "@nestjs/common";

import { AuthorController } from "@controller/author.controller";
import { BookController } from "@controller/book.controller";
import { ApiAuthorizationModule } from "@elsikora/nestjs-crud-automator";
import { AuthorEntity } from "@entity/author.entity";
import { BookEntity } from "@entity/book.entity";
import { Injectable, Module, ValidationPipe } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthorService } from "@service/author.service";
import { BookService } from "@service/book.service";

/**
 * Validates request bodies only; generated GET_LIST routes parse their typed query themselves.
 */
@Injectable()
class BodyValidationPipe extends ValidationPipe {
	public constructor() {
		super({ skipMissingProperties: true, transform: true });
	}

	public override async transform(value: unknown, metadata: ArgumentMetadata): Promise<unknown> {
		return metadata.type === "body" ? super.transform(value, metadata) : value;
	}
}

@Module({
	controllers: [AuthorController, BookController],
	imports: [TypeOrmModule.forRoot({ dropSchema: true, entities: [AuthorEntity, BookEntity], synchronize: true, type: "postgres", url: process.env.DATABASE_URL }), TypeOrmModule.forFeature([AuthorEntity, BookEntity]), ApiAuthorizationModule.forRoot()],
	providers: [{ provide: APP_PIPE, useClass: BodyValidationPipe }, AuthorService, BookService],
})
export class AppModule {}
