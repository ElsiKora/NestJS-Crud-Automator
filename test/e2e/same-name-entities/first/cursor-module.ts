import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { SameNameFirstItemCursorController } from "./cursor-controller";
import { SameNameItemEntity } from "./entity";
import { SameNameFirstItemService } from "./service";

@Module({
	controllers: [SameNameFirstItemCursorController],
	imports: [TypeOrmModule.forFeature([SameNameItemEntity])],
	providers: [SameNameFirstItemService],
})
export class SameNameFirstItemCursorModule {}
