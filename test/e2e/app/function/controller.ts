import { Body, Controller, Get, Inject, Post, Query } from "@nestjs/common";

import { E2eEntity } from "../entity";
import { E2eService } from "../service";

@Controller("function")
export class E2eFunctionController {
	@Inject(E2eService)
	public readonly service!: E2eService;

	@Get("many")
	public async getMany(@Query("ids") ids: string): Promise<Array<E2eEntity>> {
		const list = (ids ?? "")
			.split(",")
			.map((id) => id.trim())
			.filter(Boolean)
			.map((id) => ({ id }));

		return this.service.getMany({ where: list });
	}

	@Post("custom-mandatory")
	public async customMandatory(@Body() body: Partial<E2eEntity>): Promise<E2eEntity> {
		return await this.service.createWithCustomMandatory(body);
	}

	@Post("builtin-mandatory")
	public async builtinMandatory(@Body() body: Partial<E2eEntity>): Promise<E2eEntity> {
		return await this.service.createWithBuiltinMandatory(body);
	}

	@Post("builtin-none-inside-transaction")
	public async builtinNoneInsideTransaction(@Body() body: Partial<E2eEntity>): Promise<E2eEntity> {
		return await this.service.createWithBuiltinNoneInsideTransaction(body);
	}

	@Post("builtin-required")
	public async builtinRequired(@Body() body: Partial<E2eEntity>): Promise<E2eEntity> {
		return await this.service.createWithBuiltinRequired(body);
	}

	@Post("builtin-supports")
	public async builtinSupports(@Body() body: Partial<E2eEntity>): Promise<E2eEntity> {
		return await this.service.createWithBuiltinSupports(body);
	}

	@Post("custom-none-inside-transaction")
	public async customNoneInsideTransaction(@Body() body: Partial<E2eEntity>): Promise<E2eEntity> {
		return await this.service.createWithCustomNoneInsideTransaction(body);
	}

	@Post("custom-required")
	public async customRequired(@Body() body: Partial<E2eEntity>): Promise<E2eEntity> {
		return await this.service.createWithCustomRequired(body);
	}

	@Post("custom-supports")
	public async customSupports(@Body() body: Partial<E2eEntity>): Promise<E2eEntity> {
		return await this.service.createWithCustomSupports(body);
	}
}
