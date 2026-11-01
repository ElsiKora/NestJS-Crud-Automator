import { BadRequestException, Body, HttpStatus, Inject, RequestMethod } from "@nestjs/common";

import { ApiController, ApiControllerObservable, ApiRouteCustom, EApiControllerRelationReferenceShape, EApiControllerRequestTarget, EApiControllerRequestTransformerType, EApiRouteType, EErrorStringAction } from "../../../src/index";

import { E2eHydrationPostEntity } from "./entity";
import { E2eHydrationAttachmentService, E2eHydrationNoteService, E2eHydrationOwnerService, E2eHydrationPostService, E2eHydrationTagService } from "./service";

const REQUEST_INCLUDE = { attachments: true, notes: true, owner: true, profile: true, tags: true } as const;
const REQUEST_RELATIONS = { load: { include: REQUEST_INCLUDE }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.SCALAR } } as const;
const RESPONSE_RELATIONS = { load: { include: REQUEST_INCLUDE }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.OBJECT } } as const;
const RELATIONS = { request: REQUEST_RELATIONS, response: RESPONSE_RELATIONS } as const;

@ApiController<E2eHydrationPostEntity>({
	entity: E2eHydrationPostEntity,
	name: "E2eHydrationPosts",
	path: "hydration-posts",
	routes: {
		[EApiRouteType.CREATE]: { relations: RELATIONS },
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
