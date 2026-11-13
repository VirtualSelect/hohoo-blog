import { writingEntries } from "../../../src/utils/localization.cjs";

const entryPointIds = {
  "ai-apps": "doc:ai-apps/java-recovery-reconciliation",
  llm: "doc:llm/kv-cache",
  "embodied-ai": "doc:embodied-ai/mujoco-controller-holdout",
  rag: "doc:ai-apps/java-retrieval-evidence",
};

// IDs are shared across locales; the selected entry retains its localized URL.
export function selectedHomeArticle(entries, domain) {
  if (!Object.hasOwn(entryPointIds, domain)) return undefined;
  return writingEntries(entries).find(
    (entry) => entry.id === entryPointIds[domain],
  );
}
