export type QuickReplyParseResult = {
  content: string;
  quickReplies: string[];
};

const pairedQuickReplyBlock = /\[QUICK_REPLIES\]\s*([\s\S]*?)\s*\[\/QUICK_REPLIES\]/gi;
const quickReplyTag = /\[\/?QUICK_REPLIES\]/gi;
const standaloneStringArray = /^\s*\[(?:\s*"[^"\n]*"\s*(?:,\s*"[^"\n]*"\s*)*)?\]\s*$/gm;

function validReplies(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map(item => item.trim())
    .filter(item => item.length > 0 && item.length <= 80)
    .slice(0, 4);
}

/**
 * Separates model control markup from customer-visible message text. The output
 * always removes quick-reply tags, including malformed orphan tags, so internal
 * protocol text can never appear in the public chat UI.
 */
export function parseQuickReplyMarkup(rawContent: string): QuickReplyParseResult {
  let replies: string[] = [];
  let content = rawContent.replace(pairedQuickReplyBlock, (_block, payload: string) => {
    try {
      replies = validReplies(JSON.parse(payload.trim()));
    } catch {
      replies = [];
    }
    return "";
  });

  content = content
    .replace(quickReplyTag, "")
    .replace(standaloneStringArray, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { content, quickReplies: replies };
}

/** Only brand-new conversations receive a client-side fallback welcome. */
export function shouldUseLocalWelcome(messageCount: number): boolean {
  return messageCount === 0;
}
