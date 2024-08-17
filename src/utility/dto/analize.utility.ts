import { MetadataStorage } from "../../class";

export function analyzeEntityMetadata(entity: any) {
	const storage = MetadataStorage.getInstance();

	// Получить все метаданные для Bank
	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-assignment
	const bankMetadata = storage.getMetadata(entity.name);

	console.log("POPSIKL", bankMetadata);
}
