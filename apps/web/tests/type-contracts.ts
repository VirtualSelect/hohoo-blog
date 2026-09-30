// Compile-only regression tests. An unused @ts-expect-error fails typecheck if
// these boundaries accidentally become `any` during a later JS/TS migration.
import { languageUrl } from "../lib/navigation.ts";
import { useContentData } from "../runtime/data";
import {
  emptyProgress,
  updateProgress,
} from "../../../src/utils/learning-progress.ts";
import { filterWriting } from "../../../src/utils/writing-kinds.ts";
import type { ContentEntry, ClientDocument } from "../lib/site-types";

function contracts(entries: ContentEntry[], document: ClientDocument) {
  languageUrl("zh-TW", "articles", "https://huhohoo.com/articles");
  filterWriting(entries, { kind: "tutorial", domain: "llm" });
  updateProgress(emptyProgress(), "first-call", "completed");
  // @ts-expect-error Only configured locales are valid.
  languageUrl("fr", "articles", "https://huhohoo.com");
  // @ts-expect-error Dataset names must match the generated global data.
  useContentData("content-indxe");
  // @ts-expect-error Research tracks are a closed set.
  filterWriting(entries, { domain: "robotics" });
  // @ts-expect-error Completion uses a semantic state, not an invented percentage.
  updateProgress(emptyProgress(), "first-call", 100);
  // @ts-expect-error The client context must not include article HTML.
  document.html;
  // @ts-expect-error Content identifiers remain strings.
  entries[0].id = 123;
}
void contracts;
