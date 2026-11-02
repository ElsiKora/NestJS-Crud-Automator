import "reflect-metadata";

import { ApiPropertyBoolean } from "@elsikora/nestjs-crud-automator";
import { Expose, instanceToPlain } from "class-transformer";

class BundleEntity {}

class BundleDto {}

Expose({ name: "wire" })(BundleDto.prototype, "value");
ApiPropertyBoolean({ description: "value", entity: BundleEntity, isRequired: true })(BundleDto.prototype, "value");

const keys = Object.keys(instanceToPlain(Object.assign(new BundleDto(), { value: true })));

if (keys.join() !== "wire") {
	throw new Error(`The bundled property lost its @Expose name: ${keys.join()}`);
}

process.stdout.write("PASS bundled: an explicit @Expose keeps its name\n");
