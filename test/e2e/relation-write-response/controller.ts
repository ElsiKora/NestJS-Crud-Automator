import { Inject } from "@nestjs/common";

import { ApiController, EApiControllerRelationReferenceShape, EApiRouteType } from "../../../src/index";

import { E2eRelationWriteNoteEntity, E2eRelationWritePostEntity, E2eRelationWriteStampEntity, E2eRelationWriteTicketEntity } from "./entity";
import { E2eRelationWriteNotePatchService, E2eRelationWriteNoteService, E2eRelationWritePostService, E2eRelationWriteStampService, E2eRelationWriteTicketService } from "./service";

const DISABLED = { generation: { isEnabled: false } } as const;

/**
 * Builds the read and update routes of a controller with one relation config.
 * @param {object} [relations] - Relation config of every route.
 * @returns {object} Controller routes.
 */
const buildRoutes = (relations?: object): object => ({
	[EApiRouteType.CREATE]: DISABLED,
	[EApiRouteType.DELETE]: DISABLED,
	[EApiRouteType.GET]: { relations },
	[EApiRouteType.GET_LIST]: DISABLED,
	[EApiRouteType.PARTIAL_UPDATE]: { relations },
	[EApiRouteType.UPDATE]: { relations },
});

@ApiController<E2eRelationWritePostEntity>({
	entity: E2eRelationWritePostEntity,
	name: "E2eRelationWriteDefaultPosts",
	path: "relation-write-default-posts",
	routes: buildRoutes(),
} as never)
export class E2eRelationWriteDefaultController {
	public constructor(@Inject(E2eRelationWritePostService) public readonly service: E2eRelationWritePostService) {}
}

@ApiController<E2eRelationWritePostEntity>({
	entity: E2eRelationWritePostEntity,
	name: "E2eRelationWriteIncludePosts",
	path: "relation-write-include-posts",
	routes: buildRoutes({ response: { load: { include: { author: true, tags: true } }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.OBJECT } } }),
} as never)
export class E2eRelationWriteIncludeController {
	public constructor(@Inject(E2eRelationWritePostService) public readonly service: E2eRelationWritePostService) {}
}

@ApiController<E2eRelationWriteNoteEntity>({
	entity: E2eRelationWriteNoteEntity,
	name: "E2eRelationWriteNotes",
	path: "relation-write-notes",
	routes: buildRoutes(),
} as never)
export class E2eRelationWriteNoteController {
	public constructor(@Inject(E2eRelationWriteNoteService) public readonly service: E2eRelationWriteNoteService) {}
}

@ApiController<E2eRelationWriteNoteEntity>({
	entity: E2eRelationWriteNoteEntity,
	name: "E2eRelationWritePatchNotes",
	path: "relation-write-patch-notes",
	routes: buildRoutes(),
} as never)
export class E2eRelationWriteNotePatchController {
	public constructor(@Inject(E2eRelationWriteNotePatchService) public readonly service: E2eRelationWriteNotePatchService) {}
}

@ApiController<E2eRelationWriteStampEntity>({
	entity: E2eRelationWriteStampEntity,
	name: "E2eRelationWriteStamps",
	path: "relation-write-stamps",
	routes: buildRoutes(),
} as never)
export class E2eRelationWriteStampController {
	public constructor(@Inject(E2eRelationWriteStampService) public readonly service: E2eRelationWriteStampService) {}
}

@ApiController<E2eRelationWriteTicketEntity>({
	entity: E2eRelationWriteTicketEntity,
	name: "E2eRelationWriteTickets",
	path: "relation-write-tickets",
	routes: { ...buildRoutes(), [EApiRouteType.CREATE]: {}, [EApiRouteType.PARTIAL_UPDATE]: DISABLED, [EApiRouteType.UPDATE]: DISABLED },
} as never)
export class E2eRelationWriteTicketController {
	public constructor(@Inject(E2eRelationWriteTicketService) public readonly service: E2eRelationWriteTicketService) {}
}
