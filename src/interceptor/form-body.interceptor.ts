import type { CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";
import type { Observable } from "rxjs";

import { DtoFormBodySource } from "@class/utility/dto/form-body-source.class";
import { Injectable } from "@nestjs/common";

/**
 * Remembers, on every route of `ApiMethod`, a form or multipart request body, whose fields are text on the wire, so `ApiPropertyNumber` and `ApiPropertyBoolean` convert their canonical text there.
 * A JSON body is left alone, so its number and boolean fields must arrive as JSON numbers and booleans. It runs after the body shape check and before any pipe; an interceptor that fills the body, such as multer, must run before it.
 */
@Injectable()
export class FormBodyInterceptor implements NestInterceptor {
	public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const request: { body?: unknown; headers?: Record<string, Array<string> | string | undefined> } = context.switchToHttp().getRequest<{ body?: unknown; headers?: Record<string, Array<string> | string | undefined> }>();

		DtoFormBodySource.mark(request.headers?.["content-type"], request.body);

		return next.handle();
	}
}
