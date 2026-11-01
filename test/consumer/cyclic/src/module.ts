import type { ArgumentMetadata } from "@nestjs/common";

import { ApiAuthorizationModule } from "@elsikora/nestjs-crud-automator";
import { Injectable, Module, ValidationPipe } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";

import { CycAuthorEntity } from "./author.entity.js";
import { CycBookEntity } from "./book.entity.js";
import { CycAuthorController, CycBookObjectController, CycBookScalarController } from "./controllers.js";
import { CycAuthorService, CycBookService } from "./services.js";

/**
 * Validates request bodies only; generated GET_LIST routes parse their typed query themselves.
 */
@Injectable()
class CycBodyValidationPipe extends ValidationPipe {
	public constructor() {
		super({ skipMissingProperties: true, transform: true });
	}

	public override async transform(value: unknown, metadata: ArgumentMetadata): Promise<unknown> {
		return metadata.type === "body" ? super.transform(value, metadata) : value;
	}
}

@Module({
	controllers: [CycBookObjectController, CycBookScalarController, CycAuthorController],
	imports: [TypeOrmModule.forRoot({ dropSchema: true, entities: [CycAuthorEntity, CycBookEntity], synchronize: true, type: "postgres", url: process.env.DATABASE_URL }), TypeOrmModule.forFeature([CycAuthorEntity, CycBookEntity]), ApiAuthorizationModule.forRoot()],
	providers: [{ provide: APP_PIPE, useClass: CycBodyValidationPipe }, CycAuthorService, CycBookService],
})
export class CycAppModule {}
