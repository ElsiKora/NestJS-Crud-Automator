import type { TApiSubscriberFunctionAfterUpdateContext } from "../../../src/index";

import { ApiFunctionSubscriber, ApiFunctionSubscriberBase } from "../../../src/index";

import { E2eRelationWriteNoteEntity } from "./entity";

export const noteUpdateResult: { replace?: (context: TApiSubscriberFunctionAfterUpdateContext<E2eRelationWriteNoteEntity>) => E2eRelationWriteNoteEntity } = {};

@ApiFunctionSubscriber({ entity: E2eRelationWriteNoteEntity })
export class E2eRelationWriteNoteSubscriber extends ApiFunctionSubscriberBase<E2eRelationWriteNoteEntity> {
	public onAfterUpdate(context: TApiSubscriberFunctionAfterUpdateContext<E2eRelationWriteNoteEntity>): Promise<E2eRelationWriteNoteEntity> {
		return Promise.resolve(noteUpdateResult.replace ? noteUpdateResult.replace(context) : context.result);
	}
}
