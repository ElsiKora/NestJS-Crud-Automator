import type { IApiAuthorizationPrincipal, IApiControllerAuthorizationProperties, IApiPolicyAttachmentSource, IApiPolicyDocumentRecord, IApiPolicyDocumentSource } from "../../../src/index";

import { EApiAuthorizationMode, EApiPolicyEffect, EApiPolicySourceType } from "../../../src/index";

import { IntegrationDetailEntity } from "./root.entity";

const POLICY_ID: string = "sti-integration-operator-read";

export const integrationDetailAuthorization: IApiControllerAuthorizationProperties<IntegrationDetailEntity> = {
	defaultMode: EApiAuthorizationMode.IAM,
	policyNamespace: "sti:detail",
	resourceDefinition: {
		entity: IntegrationDetailEntity,
		fields: [{ isFilterable: true, path: "resource.operatorId", queryPath: "operatorId" }],
		namespace: "sti:detail",
		resourcePath: "sti:detail/{id}",
		resourceType: "sti:detail",
	},
};

export const integrationDetailAttachmentSource: IApiPolicyAttachmentSource = {
	getAttachments(principal: IApiAuthorizationPrincipal) {
		return Promise.resolve({ attachments: [{ policyId: POLICY_ID, principalId: principal.id, principalType: principal.type }], boundaries: [] });
	},
};

export const integrationDetailDocumentSource: IApiPolicyDocumentSource = {
	getDocumentsByIds(ids: ReadonlyArray<string>): Promise<ReadonlyArray<IApiPolicyDocumentRecord>> {
		const record: IApiPolicyDocumentRecord = {
			document: {
				Statement: [
					{
						Action: ["sti:detail:read", "sti:detail:list"],
						Condition: { StringEquals: { "resource.operatorId": "${principal.attributes.operatorId}" } },
						Effect: EApiPolicyEffect.ALLOW,
						Resource: ["sti:detail/*"],
					},
				],
				Version: "2026-01-01",
			},
			id: POLICY_ID,
			namespace: "sti:detail",
			sourceType: EApiPolicySourceType.MANAGED,
			version: "1",
		};

		return Promise.resolve(ids.includes(POLICY_ID) ? [record] : []);
	},
};
