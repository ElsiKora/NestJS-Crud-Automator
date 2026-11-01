import { ApiPropertyString, ApiPropertyUUID, EApiPropertyStringType } from "../../../src/index";

const entity: { name: string } = { name: "PaymentDetailFormField" };

export class PaymentDetailFormFieldItemDto {
	@ApiPropertyUUID({ entity, isResponse: true })
	public id!: string;

	@ApiPropertyString({
		description: "name",
		entity,
		exampleValue: "amount",
		format: EApiPropertyStringType.STRING,
		isResponse: true,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
	})
	public name!: string;
}
