import { Body, Controller, Post } from "@nestjs/common";

import { E2eCopyDto } from "./dto";

@Controller("copy")
export class E2eCopyController {
	@Post()
	public async create(@Body() body: E2eCopyDto): Promise<E2eCopyDto> {
		return body;
	}
}
