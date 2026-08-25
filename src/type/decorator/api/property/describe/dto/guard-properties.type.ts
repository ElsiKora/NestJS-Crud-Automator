import type { CanActivate, Type } from "@nestjs/common";

export type TApiPropertyDescribeDtoGuardProperties = {
	guards: Array<Type<CanActivate>> | Type<CanActivate>;
	isInverse?: boolean;
};
