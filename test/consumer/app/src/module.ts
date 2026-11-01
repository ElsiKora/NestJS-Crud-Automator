import type { IApiPolicyAttachmentSource, IApiPolicyDocumentSource } from "@elsikora/nestjs-crud-automator";
import type { ArgumentMetadata } from "@nestjs/common";

import { ApiAuthorizationModule, ApiSubscriberModule } from "@elsikora/nestjs-crud-automator";
import { Injectable, Module, ValidationPipe } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";

import { SmokeCursorController, SmokeIamController, SmokeItemController } from "./controller.js";
import { SmokeItemEntity, SmokeOwnerEntity } from "./entity.js";
import { SmokeAuthGuard } from "./guard.js";
import { SmokeItemPolicy } from "./policy.js";
import { SmokeItemService, SmokeOwnerService } from "./service.js";
import { SmokeFunctionSubscriber, SmokeRouteSubscriber } from "./subscriber.js";

// IAM sources that attach nothing: every IAM route resolves to an implicit deny
const emptyAttachmentSource: IApiPolicyAttachmentSource = { getAttachments: async () => ({ attachments: [], boundaries: [] }) };
const emptyDocumentSource: IApiPolicyDocumentSource = { getDocumentsByIds: async () => [] };

/**
 * Validates request bodies only; generated GET_LIST routes parse their typed query themselves.
 */
@Injectable()
class SmokeBodyValidationPipe extends ValidationPipe {
	public constructor() {
		super({ skipMissingProperties: true, transform: true });
	}

	public override async transform(value: unknown, metadata: ArgumentMetadata): Promise<unknown> {
		return metadata.type === "body" ? super.transform(value, metadata) : value;
	}
}

@Module({
	controllers: [SmokeItemController, SmokeCursorController, SmokeIamController],
	imports: [
		TypeOrmModule.forRoot({
			dropSchema: true,
			entities: [SmokeItemEntity, SmokeOwnerEntity],
			synchronize: true,
			type: "postgres",
			url: process.env.DATABASE_URL,
		}),
		TypeOrmModule.forFeature([SmokeItemEntity, SmokeOwnerEntity]),
		ApiAuthorizationModule.forRoot({ iam: { attachmentSources: [emptyAttachmentSource], documentSources: [emptyDocumentSource] } }),
		ApiSubscriberModule,
	],
	providers: [{ provide: APP_PIPE, useClass: SmokeBodyValidationPipe }, SmokeAuthGuard, SmokeItemPolicy, SmokeItemService, SmokeOwnerService, SmokeFunctionSubscriber, SmokeRouteSubscriber],
})
export class SmokeAppModule {}
