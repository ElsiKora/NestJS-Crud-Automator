import type { TApiSubscriberFunctionAfterCreateContext, TApiSubscriberFunctionAfterUpdateContext } from "../../../src/index";

import { ApiFunctionSubscriber, ApiFunctionSubscriberBase } from "../../../src/index";

import { E2eRelationWriteNoteEntity, E2eRelationWriteTicketEntity } from "./entity";

export const noteUpdateResult: { replace?: (context: TApiSubscriberFunctionAfterUpdateContext<E2eRelationWriteNoteEntity>) => E2eRelationWriteNoteEntity } = {};

export const ticketCreateResult: { replace?: (context: TApiSubscriberFunctionAfterCreateContext<E2eRelationWriteTicketEntity>) => Promise<E2eRelationWriteTicketEntity> } = {};

@ApiFunctionSubscriber({ entity: E2eRelationWriteNoteEntity })
export class E2eRelationWriteNoteSubscriber extends ApiFunctionSubscriberBase<E2eRelationWriteNoteEntity> {
	public onAfterUpdate(context: TApiSubscriberFunctionAfterUpdateContext<E2eRelationWriteNoteEntity>): Promise<E2eRelationWriteNoteEntity> {
		return Promise.resolve(noteUpdateResult.replace ? noteUpdateResult.replace(context) : context.result);
	}
}

@ApiFunctionSubscriber({ entity: E2eRelationWriteTicketEntity })
export class E2eRelationWriteTicketSubscriber extends ApiFunctionSubscriberBase<E2eRelationWriteTicketEntity> {
	public async onAfterCreate(context: TApiSubscriberFunctionAfterCreateContext<E2eRelationWriteTicketEntity>): Promise<E2eRelationWriteTicketEntity> {
		return ticketCreateResult.replace ? await ticketCreateResult.replace(context) : context.result;
	}
}
