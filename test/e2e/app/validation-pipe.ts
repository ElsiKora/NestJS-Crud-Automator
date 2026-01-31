import type { ArgumentMetadata } from "@nestjs/common";

import { Injectable, ValidationPipe } from "@nestjs/common";

@Injectable()
export class E2eValidationPipe extends ValidationPipe {
	public constructor() {
		super({
			skipMissingProperties: true,
			transform: true,
		});
	}

	public override async transform(value: unknown, metadata: ArgumentMetadata): Promise<unknown> {
		if (metadata.type !== "body") {
			return value;
		}

		return super.transform(value, metadata);
	}
}
