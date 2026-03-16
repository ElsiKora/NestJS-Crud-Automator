import { Expose } from "class-transformer";

export class E2eCustomResponseItemDto {
	@Expose({ name: "name" })
	public displayName!: string;

	@Expose({ name: "ownerId" })
	public owner!: string;

	@Expose({ name: "id" })
	public resourceId!: string;
}
