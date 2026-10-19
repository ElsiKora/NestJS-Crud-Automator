import type { CanActivate, ExecutionContext } from "@nestjs/common";

import type { IE2eStageTraceEntry } from "./entry.interface";

export class E2eStageTraceGuard implements CanActivate {
	public constructor(private readonly stage: string) {}

	public canActivate(context: ExecutionContext): boolean {
		const request: { stageTrace?: Array<IE2eStageTraceEntry>; user?: { id?: string } } = context.switchToHttp().getRequest();

		request.stageTrace ??= [];
		request.stageTrace.push({ principalId: request.user?.id ?? null, stage: this.stage });

		return true;
	}
}
