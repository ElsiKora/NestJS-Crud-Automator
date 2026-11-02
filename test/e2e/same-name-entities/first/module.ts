import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { SameNameFirstItemController } from "./controller";
import { SameNameItemEntity } from "./entity";
import { SameNameFirstItemService } from "./service";
import { SameNameFirstItemFunctionSubscriber, SameNameFirstItemRouteSubscriber } from "./subscriber";

@Module({
	controllers: [SameNameFirstItemController],
	imports: [TypeOrmModule.forFeature([SameNameItemEntity])],
	providers: [SameNameFirstItemService, SameNameFirstItemRouteSubscriber, SameNameFirstItemFunctionSubscriber],
})
export class SameNameFirstItemModule {}
