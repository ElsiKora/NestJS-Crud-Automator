import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { SameNameSecondItemCursorController } from "./cursor-controller";
import { SameNameItemEntity } from "./entity";
import { SameNameSecondItemService } from "./service";

@Module({
	controllers: [SameNameSecondItemCursorController],
	imports: [TypeOrmModule.forFeature([SameNameItemEntity])],
	providers: [SameNameSecondItemService],
})
export class SameNameSecondItemCursorModule {}
