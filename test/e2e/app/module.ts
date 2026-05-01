import { Module } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../../dist/esm/index";

import { E2eBrokenController, E2eBrokenService } from "./broken";
import { E2eCopyController } from "./copy";
import { E2eCustomItemResponseController, E2eCustomResponseController } from "./custom-response";
import { TestAuthGuard } from "./auth-guard";
import { E2eController } from "./controller";
import { E2eEntity } from "./entity";
import { E2eFunctionController } from "./function";
import { e2eHookPermissionSource } from "./hook-permission-source";
import { E2eManualController } from "./manual";
import { E2eOwnerController, E2eOwnerEntity, E2eOwnerPolicySubscriber, E2eOwnerService } from "./owner";
import { E2ePolicySubscriber } from "./policy";
import { e2eAuthorizationPrincipalResolver } from "./principal-resolver";
import { E2eService } from "./service";
import { E2eFunctionPrioritySubscriber, E2eFunctionSubscriber, E2eRouteOrderSubscriber, E2eRouteSubscriber } from "./subscribers";
import { E2eTransformerErrorController } from "./transformer-error";
import { E2eValidationPipe } from "./validation-pipe";

@Module({
	controllers: [E2eController, E2eCustomResponseController, E2eCustomItemResponseController, E2eFunctionController, E2eBrokenController, E2eCopyController, E2eManualController, E2eTransformerErrorController, E2eOwnerController],
	imports: [
		TypeOrmModule.forRoot({
			database: ":memory:",
			dropSchema: true,
			entities: [E2eEntity, E2eOwnerEntity],
			logging: false,
			synchronize: true,
			type: "sqlite",
		}),
		TypeOrmModule.forFeature([E2eEntity, E2eOwnerEntity]),
		ApiAuthorizationModule.forRoot({
			hookPermissionSources: [e2eHookPermissionSource],
			principalResolver: e2eAuthorizationPrincipalResolver,
		}),
		ApiSubscriberModule,
	],
	providers: [
		{
			provide: APP_PIPE,
			useClass: E2eValidationPipe,
		},
		E2eService,
		E2eOwnerService,
		E2eBrokenService,
		TestAuthGuard,
		E2ePolicySubscriber,
		E2eOwnerPolicySubscriber,
		E2eFunctionSubscriber,
		E2eFunctionPrioritySubscriber,
		E2eRouteSubscriber,
		E2eRouteOrderSubscriber,
	],
})
export class E2eAppModule {}
