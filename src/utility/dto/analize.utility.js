import { MetadataStorage } from "../../class";
export function analyzeEntityMetadata(entity) {
    const storage = MetadataStorage.getInstance();
    const bankMetadata = storage.getMetadata(entity.name ?? "UnknownResource");
    void bankMetadata;
}
//# sourceMappingURL=analize.utility.js.map