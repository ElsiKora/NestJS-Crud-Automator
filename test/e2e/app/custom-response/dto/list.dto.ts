import { Expose, Type } from "class-transformer";

import { E2eCustomResponseItemDto } from "./item.dto";

export class E2eCustomResponseListDto {
	@Expose({ name: "count" })
	public visibleCount!: number;

	@Expose({ name: "currentPage" })
	public page!: number;

	@Expose({ name: "items" })
	@Type(() => E2eCustomResponseItemDto)
	public entries!: Array<E2eCustomResponseItemDto>;

	@Expose({ name: "totalCount" })
	public totalItems!: number;

	@Expose({ name: "totalPages" })
	public pageCount!: number;
}
