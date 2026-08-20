import type { FindManyOptions } from "typeorm";

import { Injectable } from "@nestjs/common";
import { LessThan, MoreThan } from "typeorm";

import { ApiFunctionSubscriber, ApiFunctionSubscriberBase } from "../../../src/index";

import { CursorPaginationEntity } from "./entity";

@Injectable()
@ApiFunctionSubscriber({ entity: CursorPaginationEntity })
export class CursorPaginationSubscriber extends ApiFunctionSubscriberBase<CursorPaginationEntity> {
	public static getManyBeforeCount: number = 0;

	public static shouldUseNondeterministicWhere: boolean = false;

	public static reset(): void {
		CursorPaginationSubscriber.getManyBeforeCount = 0;
		CursorPaginationSubscriber.shouldUseNondeterministicWhere = false;
	}

	public onBeforeGetMany(context: { result: FindManyOptions<CursorPaginationEntity> }): FindManyOptions<CursorPaginationEntity> | undefined {
		if (!CursorPaginationSubscriber.shouldUseNondeterministicWhere) {
			return undefined;
		}

		CursorPaginationSubscriber.getManyBeforeCount += 1;

		return {
			...context.result,
			where: {
				rank: CursorPaginationSubscriber.getManyBeforeCount === 1 ? MoreThan(1) : LessThan(0),
			},
		};
	}
}
