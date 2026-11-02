import { BadRequestException, Body, HttpStatus, Inject, Param, RequestMethod } from "@nestjs/common";

import { ApiController, ApiControllerObservable, ApiRouteCustom, EApiControllerRelationReferenceShape, EApiControllerRequestTarget, EApiControllerRequestTransformerType, EApiRouteType, EErrorStringAction } from "../../../src/index";

import { E2eHydrationDetailEntity, E2eHydrationNoteEntity, E2eHydrationPostEntity } from "./entity";
import { E2eHydrationAttachmentService, E2eHydrationDetailService, E2eHydrationNoteService, E2eHydrationOwnerService, E2eHydrationPostService, E2eHydrationTagService } from "./service";

const REQUEST_INCLUDE = { attachments: true, notes: true, owner: true, profile: true, tags: true } as const;
const REQUEST_RELATIONS = { load: { include: REQUEST_INCLUDE }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.SCALAR } } as const;
const RESPONSE_RELATIONS = { load: { include: REQUEST_INCLUDE }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.OBJECT } } as const;
const RELATIONS = { request: REQUEST_RELATIONS, response: RESPONSE_RELATIONS } as const;
/** A create only inserts, so its request include leaves out the OneToMany relations, whose rows it would have to update. */
const CREATE_RELATIONS = { request: { load: { include: { owner: true, profile: true, tags: true } }, reference: REQUEST_RELATIONS.reference }, response: RESPONSE_RELATIONS } as const;

@ApiController<E2eHydrationPostEntity>({
	entity: E2eHydrationPostEntity,
	name: "E2eHydrationPosts",
	path: "hydration-posts",
	routes: {
		[EApiRouteType.CREATE]: { relations: CREATE_RELATIONS },
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { generation: { isEnabled: false } },
		[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
		[EApiRouteType.PARTIAL_UPDATE]: { relations: RELATIONS },
		[EApiRouteType.UPDATE]: { relations: RELATIONS },
	},
} as never)
export class E2eHydrationPostController {
	public constructor(
		@Inject(E2eHydrationPostService) public readonly service: E2eHydrationPostService,
		@Inject(E2eHydrationAttachmentService) public readonly attachmentsService: E2eHydrationAttachmentService,
		@Inject(E2eHydrationNoteService) public readonly notesService: E2eHydrationNoteService,
		@Inject(E2eHydrationOwnerService) public readonly ownerService: E2eHydrationOwnerService,
		@Inject(E2eHydrationOwnerService) public readonly profileService: E2eHydrationOwnerService,
		@Inject(E2eHydrationTagService) public readonly tagsService: E2eHydrationTagService,
	) {}

	@ApiRouteCustom<E2eHydrationPostEntity>({
		relations: { request: REQUEST_RELATIONS },
		resource: { action: "hydration.custom", entity: E2eHydrationPostEntity },
		response: { status: HttpStatus.OK, type: undefined },
		route: { method: RequestMethod.POST, path: "custom" },
	} as never)
	public inspectBody(@Body() body: Record<string, unknown>): unknown {
		return { owner: body.owner, tags: body.tags };
	}

	@ApiRouteCustom<E2eHydrationPostEntity>({
		relations: { request: REQUEST_RELATIONS },
		resource: { action: "hydration.custom-update", entity: E2eHydrationPostEntity },
		response: { status: HttpStatus.OK, type: undefined },
		route: { method: RequestMethod.PUT, path: "custom/:id", type: EApiRouteType.UPDATE },
	} as never)
	public async customUpdate(@Param("id") id: string, @Body() body: Record<string, unknown>): Promise<unknown> {
		await this.service.update({ id }, body as never);

		return { id };
	}

	@ApiRouteCustom<E2eHydrationPostEntity>({
		relations: { request: REQUEST_RELATIONS },
		resource: { action: "hydration.custom-partial-update", entity: E2eHydrationPostEntity },
		response: { status: HttpStatus.OK, type: undefined },
		route: { method: RequestMethod.PATCH, path: "custom/:id", type: EApiRouteType.PARTIAL_UPDATE },
	} as never)
	public async customPartialUpdate(@Param("id") id: string, @Body() body: Record<string, unknown>): Promise<unknown> {
		await this.service.update({ id }, body as never);

		return { id };
	}
}

/** PARTIAL_UPDATE excludes tags and leaves notes out of include; UPDATE has no relations.request at all. */
const EXCLUDED_RELATIONS = { request: { load: { include: { owner: true, tags: false } }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.SCALAR } }, response: RESPONSE_RELATIONS } as const;

@ApiControllerObservable()
@ApiController<E2eHydrationPostEntity>({
	entity: E2eHydrationPostEntity,
	name: "E2eHydrationUnhydratedPosts",
	path: "hydration-unhydrated-posts",
	routes: {
		[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { generation: { isEnabled: false } },
		[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
		[EApiRouteType.PARTIAL_UPDATE]: { relations: EXCLUDED_RELATIONS },
		[EApiRouteType.UPDATE]: {},
	},
} as never)
export class E2eHydrationUnhydratedPostController {
	public constructor(
		@Inject(E2eHydrationPostService) public readonly service: E2eHydrationPostService,
		@Inject(E2eHydrationOwnerService) public readonly ownerService: E2eHydrationOwnerService,
	) {}
}

/** Records every body validator call on the ordered routes, so a test can prove the to-many guard ran first. */
export const HYDRATION_ORDERED_VALIDATOR_CALLS: Array<unknown> = [];

const ORDERED_ROUTE = {
	request: {
		[EApiControllerRequestTarget.BODY]: {
			// Clears a to-many key; had it run before the guard, the guard would see nothing to reject.
			transformers: [{ key: "tags", shouldSetValueEvenIfMissing: true, type: EApiControllerRequestTransformerType.STATIC, value: undefined }],
			validators: [
				{
					errorType: EErrorStringAction.VALIDATION_ERROR,
					exception: BadRequestException,
					validationFunction: (payload: unknown): boolean => {
						HYDRATION_ORDERED_VALIDATOR_CALLS.push(payload);

						return true;
					},
				},
			],
		},
	},
} as const;

@ApiController<E2eHydrationPostEntity>({
	entity: E2eHydrationPostEntity,
	name: "E2eHydrationOrderedPosts",
	path: "hydration-ordered-posts",
	routes: {
		[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { generation: { isEnabled: false } },
		[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
		[EApiRouteType.PARTIAL_UPDATE]: ORDERED_ROUTE,
		[EApiRouteType.UPDATE]: ORDERED_ROUTE,
	},
} as never)
export class E2eHydrationOrderedPostController {
	public constructor(@Inject(E2eHydrationPostService) public readonly service: E2eHydrationPostService) {}
}

/** Table inheritance root that writes but generates no read response, so no read plan lists its variants. */
@ApiController<E2eHydrationDetailEntity>({
	entity: E2eHydrationDetailEntity,
	name: "E2eHydrationDetails",
	path: "hydration-details",
	routes: {
		[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { generation: { isEnabled: false } },
		[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
		[EApiRouteType.PARTIAL_UPDATE]: {},
		[EApiRouteType.UPDATE]: {},
	},
} as never)
export class E2eHydrationDetailController {
	public constructor(@Inject(E2eHydrationDetailService) public readonly service: E2eHydrationDetailService) {}
}

/** Records every body validator call on the observed custom update routes. */
export const HYDRATION_CUSTOM_VALIDATOR_CALLS: Array<unknown> = [];

/** Title the body validator of the observed custom update routes refuses, so a test can tell it ran. */
export const HYDRATION_CUSTOM_REFUSED_TITLE: string = "refused by validator";

const CUSTOM_ORDERED_REQUEST = {
	[EApiControllerRequestTarget.BODY]: {
		// Clears a to-many key; had it run before the guard, the guard would see nothing to reject.
		transformers: [{ key: "tags", shouldSetValueEvenIfMissing: true, type: EApiControllerRequestTransformerType.STATIC, value: undefined }],
		validators: [
			{
				errorType: EErrorStringAction.VALIDATION_ERROR,
				exception: BadRequestException,
				validationFunction: (payload: unknown): boolean => {
					HYDRATION_CUSTOM_VALIDATOR_CALLS.push(payload);

					return (payload as { title?: unknown }).title !== HYDRATION_CUSTOM_REFUSED_TITLE;
				},
			},
		],
	},
} as const;

/** Observable controller whose custom update routes forward the body, to pin where the to-many guard runs. */
@ApiControllerObservable()
@ApiController<E2eHydrationPostEntity>({
	entity: E2eHydrationPostEntity,
	name: "E2eHydrationObservedPosts",
	path: "hydration-observed-posts",
	routes: {
		[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { generation: { isEnabled: false } },
		[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
} as never)
export class E2eHydrationObservedPostController {
	public constructor(
		@Inject(E2eHydrationPostService) public readonly service: E2eHydrationPostService,
		@Inject(E2eHydrationTagService) public readonly tagsService: E2eHydrationTagService,
	) {}

	@ApiRouteCustom<E2eHydrationPostEntity>({
		relations: { request: { load: { include: { tags: true } }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.SCALAR } } },
		request: CUSTOM_ORDERED_REQUEST,
		resource: { action: "hydration.observed-update", entity: E2eHydrationPostEntity },
		response: { status: HttpStatus.OK, type: undefined },
		route: { method: RequestMethod.PUT, path: ":id", type: EApiRouteType.UPDATE },
	} as never)
	public async observedUpdate(@Param("id") id: string, @Body() body: Record<string, unknown>): Promise<unknown> {
		await this.service.update({ id }, body as never);

		return { id };
	}

	@ApiRouteCustom<E2eHydrationPostEntity>({
		relations: { request: { load: { include: { tags: true } }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.SCALAR } } },
		request: CUSTOM_ORDERED_REQUEST,
		resource: { action: "hydration.observed-partial-update", entity: E2eHydrationPostEntity },
		response: { status: HttpStatus.OK, type: undefined },
		route: { method: RequestMethod.PATCH, path: ":id", type: EApiRouteType.PARTIAL_UPDATE },
	} as never)
	public async observedPartialUpdate(@Param("id") id: string, @Body() body: Record<string, unknown>): Promise<unknown> {
		await this.service.update({ id }, body as never);

		return { id };
	}
}

/** Binds an existing note to a post through the update of the note, the way a create cannot. */
@ApiController<E2eHydrationNoteEntity>({
	entity: E2eHydrationNoteEntity,
	name: "E2eHydrationNotes",
	path: "hydration-notes",
	routes: {
		[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { generation: { isEnabled: false } },
		[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
		[EApiRouteType.PARTIAL_UPDATE]: { relations: { request: { load: { include: { post: true } }, reference: REQUEST_RELATIONS.reference }, response: { load: { include: { post: true } }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.OBJECT } } } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
} as never)
export class E2eHydrationNoteController {
	public constructor(
		@Inject(E2eHydrationNoteService) public readonly service: E2eHydrationNoteService,
		@Inject(E2eHydrationPostService) public readonly postService: E2eHydrationPostService,
	) {}
}
