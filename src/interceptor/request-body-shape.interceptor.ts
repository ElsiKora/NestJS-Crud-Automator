import type { CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";
import type { Observable } from "rxjs";

import { Injectable } from "@nestjs/common";
import { ApiRouteAssertRequestBodyShape } from "@utility/api/route/assert-request-body-shape.utility";

/**
 * Applies the request body limits on every route of `ApiMethod`. An interceptor rather than a guard: every guard has run by then, whatever their order, so an anonymous caller gets its 401 or 403 and never a 400 about the body, and pipes have not run yet.
 * Only reads the parsed `request.body`, so a body the route has not consumed stays unconsumed.
 */
@Injectable()
export class RequestBodyShapeInterceptor implements NestInterceptor {
	public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		ApiRouteAssertRequestBodyShape(context.switchToHttp().getRequest<{ body?: unknown }>().body);

		return next.handle();
	}
}
