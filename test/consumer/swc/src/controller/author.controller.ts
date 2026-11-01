import { ApiController, EApiRouteType } from "@elsikora/nestjs-crud-automator";
import { AuthorEntity } from "@entity/author.entity";
import { Inject } from "@nestjs/common";
import { AuthorService } from "@service/author.service";

@ApiController<AuthorEntity>({
	entity: AuthorEntity,
	name: "SwcAuthors",
	path: "authors",
	routes: {
		[EApiRouteType.CREATE]: {},
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: {},
		[EApiRouteType.GET_LIST]: {},
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
})
export class AuthorController {
	@Inject(AuthorService)
	public readonly service!: AuthorService;
}
