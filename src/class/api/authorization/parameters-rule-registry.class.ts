import type { IApiControllerParametersRule } from "@interface/class/api/controller/parameters-rule.interface";

import { Injectable } from "@nestjs/common";

/**
 * Holds the path value rules of the securable custom routes of one application, and the path parameters each securable route was checked for at startup, keyed by controller class and handler.
 * An inherited handler is one function shared by every subclass, so each subclass keeps its own rule here, built from its own resource path, and nothing outlives the application.
 */
@Injectable()
export class ApiAuthorizationParametersRuleRegistry {
	private isChecked: boolean = false;

	private readonly PATH_PARAMETERS: Map<object, Map<object, ReadonlySet<string>>> = new Map<object, Map<object, ReadonlySet<string>>>();

	private readonly RULES: Map<object, Map<object, IApiControllerParametersRule>> = new Map<object, Map<object, IApiControllerParametersRule>>();

	public clear(): void {
		this.PATH_PARAMETERS.clear();
		this.RULES.clear();
		this.isChecked = false;
	}

	public get(controller: object, handler: object): IApiControllerParametersRule | undefined {
		return this.RULES.get(controller)?.get(handler);
	}

	/**
	 * Returns the path parameters a securable route was checked for at startup: the parameters of its global prefix, `RouterModule` path, controller path, and route path.
	 * @param {object} controller - Controller class.
	 * @param {object} handler - Handler function.
	 * @returns {ReadonlySet<string> | undefined} The parameter names, or undefined when startup did not check the route.
	 */
	public getPathParameters(controller: object, handler: object): ReadonlySet<string> | undefined {
		return this.PATH_PARAMETERS.get(controller)?.get(handler);
	}

	/**
	 * Tells whether startup checked the routes of this application. A test that replaces `ApiAuthorizationBootstrapValidationService` turns every startup check off, so nothing is recorded to compare a request with.
	 * @returns {boolean} Whether startup filled this registry.
	 */
	public isStartupChecked(): boolean {
		return this.isChecked;
	}

	/**
	 * Records that startup checked every securable route of this application, so a route without recorded path parameters was not served at startup.
	 * @returns {void}
	 */
	public markStartupChecked(): void {
		this.isChecked = true;
	}

	public set(controller: object, handler: object, rule: IApiControllerParametersRule): void {
		const controllerRules: Map<object, IApiControllerParametersRule> = this.RULES.get(controller) ?? new Map<object, IApiControllerParametersRule>();
		controllerRules.set(handler, rule);
		this.RULES.set(controller, controllerRules);
	}

	/**
	 * Records the path parameters a securable route was checked for at startup, so the guard can refuse a request that carries another one.
	 * @param {object} controller - Controller class.
	 * @param {object} handler - Handler function.
	 * @param {ReadonlySet<string>} parameters - The parameter names of the whole route path.
	 * @returns {void}
	 */
	public setPathParameters(controller: object, handler: object, parameters: ReadonlySet<string>): void {
		const controllerParameters: Map<object, ReadonlySet<string>> = this.PATH_PARAMETERS.get(controller) ?? new Map<object, ReadonlySet<string>>();
		controllerParameters.set(handler, parameters);
		this.PATH_PARAMETERS.set(controller, controllerParameters);
	}
}
