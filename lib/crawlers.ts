import { HTML_LIMITED_BOT_UA_RE } from "next/dist/shared/lib/router/utils/html-bots";

const AI_CRAWLER_UA_RE =
  /GPTBot|OAI-SearchBot|ChatGPT-User|ClaudeBot|Claude-User|Claude-SearchBot|anthropic-ai|PerplexityBot|Perplexity-User|Amazonbot|meta-externalagent|meta-externalfetcher|FacebookBot|Bytespider|CCBot|cohere-ai|DuckAssistBot|MistralAI-User|YouBot|Diffbot/i;

export const HTML_ONLY_CRAWLER_UA_RE = new RegExp(`${HTML_LIMITED_BOT_UA_RE.source}|${AI_CRAWLER_UA_RE.source}`, "i");

export const isHtmlOnlyCrawler = (userAgent: string | null | undefined) =>
  Boolean(userAgent && HTML_ONLY_CRAWLER_UA_RE.test(userAgent));
