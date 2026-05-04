import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationPolicySubscriberRegistration } from "@interface/class/api/authorization";

export class PolicySubscriberWrapper {
	public registrations: Array<IApiAuthorizationPolicySubscriberRegistration<IApiBaseEntity>>;

	constructor(
		private readonly name: string,
		registrations: Array<IApiAuthorizationPolicySubscriberRegistration<IApiBaseEntity>> = [],
	) {
		this.registrations = registrations;
	}

	public addRegistration(registration: IApiAuthorizationPolicySubscriberRegistration<IApiBaseEntity>): void {
		this.registrations.push(registration);
		this.registrations.sort((a: IApiAuthorizationPolicySubscriberRegistration<IApiBaseEntity>, b: IApiAuthorizationPolicySubscriberRegistration<IApiBaseEntity>) => (b.priority ?? 0) - (a.priority ?? 0));
	}

	public getName(): string {
		return this.name;
	}

	public getRegistrationCount(): number {
		return this.registrations.length;
	}
}
