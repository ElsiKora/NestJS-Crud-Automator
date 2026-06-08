import type { IApiAuthorizationPrincipal } from "@interface/class/api/authorization";
import type { IApiSubscriberRoute } from "@interface/class/api/subscriber/route.interface";
import type { TApiSubscriberRouteBeforeCreateContext, TApiSubscriberRouteBeforeDeleteContext, TApiSubscriberRouteBeforeGetContext, TApiSubscriberRouteBeforeGetListContext, TApiSubscriberRouteBeforePartialUpdateContext, TApiSubscriberRouteBeforeUpdateContext } from "@type/class/api/subscriber/route";

import { ApiRouteSubscriberBase } from "@class/api/subscriber/route-base.class";
import { EApiRouteSubscriberAuthorizationExpectation } from "@enum/decorator/api";
import { describe, expect, expectTypeOf, it } from "vitest";

class RouteAuthorizationEntity {
	public id?: string;
}

describe("route subscriber authorization expectation generics", () => {
	it("should keep route authentication request optional by default", () => {
		type Context = TApiSubscriberRouteBeforeCreateContext<RouteAuthorizationEntity>;

		expectTypeOf<Context["result"]["authenticationRequest"]>().toEqualTypeOf<Context["result"]["authenticationRequest"] | undefined>();

		const assertOptional = (context: Context): void => {
			// @ts-expect-error Default route subscriber contexts do not guarantee authentication metadata.
			context.result.authenticationRequest.authorizationDecision.principal;
		};

		expect(assertOptional).toBeTypeOf("function");
	});

	it("should require authentication request and authorization decision when expected", () => {
		type Context = TApiSubscriberRouteBeforeCreateContext<RouteAuthorizationEntity, EApiRouteSubscriberAuthorizationExpectation.REQUIRED>;

		expectTypeOf<Context["result"]["authenticationRequest"]["authorizationDecision"]["principal"]>().toEqualTypeOf<IApiAuthorizationPrincipal>();

		const assertRequired = (context: Context): IApiAuthorizationPrincipal => context.result.authenticationRequest.authorizationDecision.principal;

		expect(assertRequired).toBeTypeOf("function");
	});

	it("should keep mixed or wide authorization expectations optional", () => {
		type MixedContext = TApiSubscriberRouteBeforeCreateContext<RouteAuthorizationEntity, EApiRouteSubscriberAuthorizationExpectation.OPTIONAL | EApiRouteSubscriberAuthorizationExpectation.REQUIRED>;
		type WideContext = TApiSubscriberRouteBeforeCreateContext<RouteAuthorizationEntity, EApiRouteSubscriberAuthorizationExpectation>;

		expectTypeOf<MixedContext["result"]["authenticationRequest"]>().toEqualTypeOf<MixedContext["result"]["authenticationRequest"] | undefined>();
		expectTypeOf<WideContext["result"]["authenticationRequest"]>().toEqualTypeOf<WideContext["result"]["authenticationRequest"] | undefined>();
	});

	it("should expose authorization expectation generics for every generated before route helper", () => {
		expectTypeOf<TApiSubscriberRouteBeforeCreateContext<RouteAuthorizationEntity, EApiRouteSubscriberAuthorizationExpectation.REQUIRED>["result"]["authenticationRequest"]["authorizationDecision"]["principal"]>().toEqualTypeOf<IApiAuthorizationPrincipal>();
		expectTypeOf<TApiSubscriberRouteBeforeDeleteContext<RouteAuthorizationEntity, EApiRouteSubscriberAuthorizationExpectation.REQUIRED>["result"]["authenticationRequest"]["authorizationDecision"]["principal"]>().toEqualTypeOf<IApiAuthorizationPrincipal>();
		expectTypeOf<TApiSubscriberRouteBeforeGetContext<RouteAuthorizationEntity, EApiRouteSubscriberAuthorizationExpectation.REQUIRED>["result"]["authenticationRequest"]["authorizationDecision"]["principal"]>().toEqualTypeOf<IApiAuthorizationPrincipal>();
		expectTypeOf<TApiSubscriberRouteBeforeGetListContext<RouteAuthorizationEntity, EApiRouteSubscriberAuthorizationExpectation.REQUIRED>["result"]["authenticationRequest"]["authorizationDecision"]["principal"]>().toEqualTypeOf<IApiAuthorizationPrincipal>();
		expectTypeOf<TApiSubscriberRouteBeforePartialUpdateContext<RouteAuthorizationEntity, EApiRouteSubscriberAuthorizationExpectation.REQUIRED>["result"]["authenticationRequest"]["authorizationDecision"]["principal"]>().toEqualTypeOf<IApiAuthorizationPrincipal>();
		expectTypeOf<TApiSubscriberRouteBeforeUpdateContext<RouteAuthorizationEntity, EApiRouteSubscriberAuthorizationExpectation.REQUIRED>["result"]["authenticationRequest"]["authorizationDecision"]["principal"]>().toEqualTypeOf<IApiAuthorizationPrincipal>();
	});

	it("should keep existing route subscriber base declarations compatible", () => {
		class DefaultRouteSubscriber extends ApiRouteSubscriberBase<RouteAuthorizationEntity> {}

		const subscriber = new DefaultRouteSubscriber();

		expectTypeOf(subscriber).toMatchTypeOf<IApiSubscriberRoute<RouteAuthorizationEntity>>();
		expect(subscriber).toBeInstanceOf(ApiRouteSubscriberBase);
	});

	it("should allow route subscriber base declarations to opt into required authorization", () => {
		class RequiredRouteSubscriber extends ApiRouteSubscriberBase<RouteAuthorizationEntity, EApiRouteSubscriberAuthorizationExpectation.REQUIRED> {
			public async onBeforeCreate(context: TApiSubscriberRouteBeforeCreateContext<RouteAuthorizationEntity, EApiRouteSubscriberAuthorizationExpectation.REQUIRED>): Promise<TApiSubscriberRouteBeforeCreateContext<RouteAuthorizationEntity, EApiRouteSubscriberAuthorizationExpectation.REQUIRED>["result"]> {
				expectTypeOf(context.result.authenticationRequest.authorizationDecision.principal).toEqualTypeOf<IApiAuthorizationPrincipal>();

				return context.result;
			}
		}

		const subscriber = new RequiredRouteSubscriber();

		expectTypeOf(subscriber).toMatchTypeOf<IApiSubscriberRoute<RouteAuthorizationEntity, EApiRouteSubscriberAuthorizationExpectation.REQUIRED>>();
		expect(subscriber).toBeInstanceOf(ApiRouteSubscriberBase);
	});
});
