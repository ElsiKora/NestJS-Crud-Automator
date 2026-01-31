import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from "@nestjs/common";

import { E2eBrokenService } from "./service";

@Controller("broken")
export class E2eBrokenController {
	@Inject(E2eBrokenService)
	public readonly service!: E2eBrokenService;

	@Post("create")
	public async create(@Body() body: Record<string, unknown>) {
		return this.service.create(body);
	}

	@Get("get/:id")
	public async get(@Param("id") id: string) {
		return this.service.get({ where: { id } });
	}

	@Get("list")
	public async getList(@Query("limit") limit: string, @Query("page") page: string) {
		const take = Number(limit || 10);
		const currentPage = Number(page || 1);
		return this.service.getList({ skip: take * Math.max(currentPage - 1, 0), take });
	}

	@Get("many")
	public async getMany(@Query("ids") ids: string) {
		const list = (ids ?? "")
			.split(",")
			.map((id) => id.trim())
			.filter(Boolean)
			.map((id) => ({ id }));

		return this.service.getMany({ where: list });
	}

	@Patch("update/:id")
	public async update(@Param("id") id: string, @Body() body: Record<string, unknown>) {
		return this.service.update({ id }, body);
	}

	@Delete("delete/:id")
	public async delete(@Param("id") id: string) {
		return this.service.delete({ id });
	}
}
