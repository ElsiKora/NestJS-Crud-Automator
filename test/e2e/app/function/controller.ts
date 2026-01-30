import { Controller, Get, Inject, Query } from "@nestjs/common";

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
}
