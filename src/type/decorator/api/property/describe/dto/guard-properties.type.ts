import type { Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";

export type TApiPropertyDescribeDtoGuardProperties = {
	guards: Array<Type<IAuthGuard>> | Type<IAuthGuard>;
	isInverse?: boolean;
};
