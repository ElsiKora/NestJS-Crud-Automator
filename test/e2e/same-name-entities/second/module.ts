import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { SameNameSecondItemController } from "./controller";
import { SameNameItemEntity } from "./entity";
import { SameNameSecondItemService } from "./service";
import { SameNameSecondItemFunctionSubscriber, SameNameSecondItemRouteSubscriber } from "./subscriber";

@Module({
	controllers: [SameNameSecondItemController],
	imports: [TypeOrmModule.forFeature([SameNameItemEntity])],
	providers: [SameNameSecondItemService, SameNameSecondItemRouteSubscriber, SameNameSecondItemFunctionSubscriber],
})
export class SameNameSecondItemModule {}
