import type { OpenAPIObject } from "@nestjs/swagger";

import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../../src/index";

import { E2eRenameMapAdminItemController, E2eRenameMapPublicItemController, E2eRenameMapRecordController } from "./controller";
import { E2eRenameMapItemEntity, E2eRenameMapRecordEntity } from "./entity";
import { E2eRenameMapItemService, E2eRenameMapRecordService } from "./service";

/**
 * Builds the OpenAPI document of the fixture application, which is also how `app.dev-openapi.json` was captured on dev at ec4a659d with the 4.x names.
 * @returns {Promise<OpenAPIObject>} The OpenAPI document.
 */
export async function createE2eRenameMapDocument(): Promise<OpenAPIObject> {
	const moduleReference = await Test.createTestingModule({
		controllers: [E2eRenameMapAdminItemController, E2eRenameMapPublicItemController, E2eRenameMapRecordController],
		imports: [
			TypeOrmModule.forRoot({
				database: ":memory:",
				dropSchema: true,
				entities: [E2eRenameMapItemEntity, E2eRenameMapRecordEntity],
				logging: false,
				synchronize: true,
				type: "better-sqlite3",
			}),
			TypeOrmModule.forFeature([E2eRenameMapItemEntity, E2eRenameMapRecordEntity]),
			ApiAuthorizationModule.forRoot(),
			ApiSubscriberModule,
		],
		providers: [E2eRenameMapItemService, E2eRenameMapRecordService],
	}).compile();
	const app = moduleReference.createNestApplication(new FastifyAdapter());

	await app.init();

	const document: OpenAPIObject = SwaggerModule.createDocument(app, new DocumentBuilder().build());

	await app.close();

	return document;
}
