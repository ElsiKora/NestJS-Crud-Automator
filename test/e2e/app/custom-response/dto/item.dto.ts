import { Expose } from "class-transformer";

export class E2eCustomResponseItemDto {
	@Expose({ name: "resourceId" })
	public id!: string;

	@Expose({ name: "displayName" })
	public name!: string;

	@Expose({ name: "owner" })
	public ownerId!: string;
}
