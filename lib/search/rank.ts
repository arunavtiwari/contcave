import { normalizeText } from "@/lib/search/vocabulary";

export type RankedList = string[][];

const BM25 = { k1: 1.2, b: 0.75 };

const STOPWORDS = new Set([
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "have", "i", "in", "is", "it", "me", "my", "need",
    "needs", "of", "on", "or", "our", "please", "shoot", "studio", "studios", "the", "to", "us", "want", "we", "with", "around",
    "near", "looking", "space", "budget", "hai", "hain", "ke", "ki", "ka", "liye", "mein", "chahiye", "aur", "people", "hours",
]);

export function tokenize(text: string) {
    return normalizeText(text)
        .split(" ")
        .map((token) => token.replace(/^[./:-]+|[./:-]+$/g, ""))
        .filter((token) => token.length > 1 && !STOPWORDS.has(token) && !/\d/.test(token));
}

export function rankByScore(scores: Map<string, number>): RankedList {
    const tiers = new Map<number, string[]>();
    for (const [id, score] of scores) {
        if (score <= 0) continue;
        const tier = tiers.get(score) ?? [];
        tier.push(id);
        tiers.set(score, tier);
    }
    return Array.from(tiers.entries()).sort(([a], [b]) => b - a).map(([, ids]) => ids);
}

export function reciprocalRankFusion(lists: RankedList[], k: number): Map<string, number> {
    const present = lists.filter((list) => list.length > 0);
    const fused = new Map<string, number>();
    if (!present.length) return fused;

    for (const list of present) {
        let rank = 1;
        for (const tier of list) {
            for (const id of tier) fused.set(id, (fused.get(id) ?? 0) + 1 / (k + rank));
            rank += tier.length;
        }
    }

    const best = present.length / (k + 1);
    for (const [id, score] of fused) fused.set(id, score / best);
    return fused;
}

export function bm25Scores(query: string, documents: Map<string, string>): Map<string, number> {
    const terms = Array.from(new Set(tokenize(query)));
    const scores = new Map<string, number>();
    if (!terms.length || !documents.size) return scores;

    const tokenized = new Map(Array.from(documents, ([id, text]) => [id, tokenize(text)] as const));
    const averageLength = Array.from(tokenized.values()).reduce((sum, tokens) => sum + tokens.length, 0) / tokenized.size || 1;
    const documentFrequency = new Map(terms.map((term) => [
        term,
        Array.from(tokenized.values()).filter((tokens) => tokens.includes(term)).length,
    ]));

    for (const [id, tokens] of tokenized) {
        let score = 0;
        for (const term of terms) {
            const frequency = tokens.filter((token) => token === term).length;
            if (!frequency) continue;
            const df = documentFrequency.get(term) ?? 0;
            const idf = Math.log(1 + (tokenized.size - df + 0.5) / (df + 0.5));
            score += idf * (frequency * (BM25.k1 + 1)) / (frequency + BM25.k1 * (1 - BM25.b + BM25.b * (tokens.length / averageLength)));
        }
        if (score > 0) scores.set(id, score);
    }
    return scores;
}

export function dotProduct(a: Float32Array, b: Float32Array) {
    const length = Math.min(a.length, b.length);
    let sum = 0;
    for (let index = 0; index < length; index++) sum += a[index] * b[index];
    return sum;
}
