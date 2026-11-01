import { ApiController, EApiControllerRelationReferenceShape, EApiRouteType } from "@elsikora/nestjs-crud-automator";
import { BookEntity } from "@entity/book.entity";
import { Inject } from "@nestjs/common";
import { AuthorService } from "@service/author.service";
import { BookService } from "@service/book.service";

const authorResponse = { response: { load: { include: { author: true } }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.OBJECT } } } as const;

@ApiController<BookEntity>({
	entity: BookEntity,
	name: "SwcBooks",
	path: "books",
	routes: {
		[EApiRouteType.CREATE]: { relations: { request: { load: { include: { author: true } }, reference: { shape: EApiControllerRelationReferenceShape.SCALAR } }, ...authorResponse } },
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { relations: authorResponse },
		[EApiRouteType.GET_LIST]: { relations: authorResponse },
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
})
export class BookController {
	@Inject(AuthorService)
	public readonly authorService!: AuthorService;

	@Inject(BookService)
	public readonly service!: BookService;
}
