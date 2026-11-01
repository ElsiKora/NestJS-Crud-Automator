import { ApiController, EApiControllerRelationReferenceShape, EApiRouteType } from "@elsikora/nestjs-crud-automator";
import { Inject } from "@nestjs/common";

import { CycAuthorEntity } from "./author.entity.js";
import { CycBookEntity } from "./book.entity.js";
import { CycAuthorService, CycBookService } from "./services.js";

const objectResponse = { response: { load: { include: { author: true } }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.OBJECT } } } as const;
const scalarResponse = { response: { load: { include: { author: true } }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.SCALAR } } } as const;

@ApiController<CycBookEntity>({
	entity: CycBookEntity,
	name: "CycBooksObject",
	path: "books-object",
	routes: {
		[EApiRouteType.CREATE]: { relations: { request: { load: { include: { author: true } }, reference: { shape: EApiControllerRelationReferenceShape.SCALAR } }, ...objectResponse } },
		[EApiRouteType.DELETE]: {},
		[EApiRouteType.GET]: { relations: objectResponse },
		[EApiRouteType.GET_LIST]: { relations: objectResponse },
		[EApiRouteType.PARTIAL_UPDATE]: { relations: { request: { load: { include: { author: true } }, reference: { shape: EApiControllerRelationReferenceShape.SCALAR } }, ...objectResponse } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
})
export class CycBookObjectController {
	@Inject(CycAuthorService)
	public readonly authorService!: CycAuthorService;

	@Inject(CycBookService)
	public readonly service!: CycBookService;
}

@ApiController<CycBookEntity>({
	entity: CycBookEntity,
	name: "CycBooksScalar",
	path: "books-scalar",
	routes: {
		[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { relations: scalarResponse },
		[EApiRouteType.GET_LIST]: { relations: scalarResponse },
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
})
export class CycBookScalarController {
	@Inject(CycBookService)
	public readonly service!: CycBookService;
}

@ApiController<CycAuthorEntity>({
	entity: CycAuthorEntity,
	name: "CycAuthors",
	path: "authors",
	routes: {
		[EApiRouteType.CREATE]: {},
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { relations: { response: { load: { include: { books: true } }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.OBJECT } } } },
		[EApiRouteType.GET_LIST]: {},
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
})
export class CycAuthorController {
	@Inject(CycAuthorService)
	public readonly service!: CycAuthorService;
}
