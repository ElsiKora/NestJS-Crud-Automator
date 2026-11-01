import type { IApiControllerParametersRule } from "@interface/class/api/controller";

import { Injectable } from "@nestjs/common";

/**
 * Holds the path value rules of the IAM custom routes of one application, keyed by controller class and handler.
 * An inherited handler is one function shared by every subclass, so each subclass keeps its own rule here, built from its own resource path, and no rule outlives the application.
 */
@Injectable()
export class ApiAuthorizationParametersRuleRegistry {
	private readonly RULES: Map<object, Map<object, IApiControllerParametersRule>> = new Map<object, Map<object, IApiControllerParametersRule>>();

	public clear(): void {
		this.RULES.clear();
	}

	public get(controller: object, handler: object): IApiControllerParametersRule | undefined {
		return this.RULES.get(controller)?.get(handler);
	}

	public set(controller: object, handler: object, rule: IApiControllerParametersRule): void {
		const controllerRules: Map<object, IApiControllerParametersRule> = this.RULES.get(controller) ?? new Map<object, IApiControllerParametersRule>();
		controllerRules.set(handler, rule);
		this.RULES.set(controller, controllerRules);
	}
}
