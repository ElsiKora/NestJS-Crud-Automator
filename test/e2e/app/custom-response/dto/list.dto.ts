import { Expose, Type } from "class-transformer";

import { E2eCustomResponseItemDto } from "./item.dto";

export class E2eCustomResponseListDto {
	@Expose({ name: "visibleCount" })
	public count!: number;

	@Expose({ name: "page" })
	public currentPage!: number;

	@Expose({ name: "entries" })
	@Type(() => E2eCustomResponseItemDto)
	public items!: Array<E2eCustomResponseItemDto>;

	@Expose({ name: "totalItems" })
	public totalCount!: number;

	@Expose({ name: "pageCount" })
	public totalPages!: number;
}
