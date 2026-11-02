import type { CanActivate, Type } from "@nestjs/common";

const createGuard = (): Type<CanActivate> => {
	// Both exports below are this class, so two different guard classes share one name on purpose.
	class SameNameGuard implements CanActivate {
		public canActivate(): boolean {
			return true;
		}
	}

	return SameNameGuard;
};

export const SameNameAdminGuard: Type<CanActivate> = createGuard();
export const SameNamePublicGuard: Type<CanActivate> = createGuard();
