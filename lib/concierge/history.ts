import type { ChatMessage } from "./model";

/**
 * The part of a conversation's history that is sent to the model. The stored
 * history is never cut; this only chooses how much of it fits.
 *
 * Open models have small context windows, so a long conversation has to drop
 * its oldest turns. Two rules keep that safe:
 *  - cuts happen only at the start of a customer turn, so a tool call is never
 *    separated from its results;
 *  - the cut point moves in steps of several turns, not every turn, so the
 *    model server can keep reusing its work on the unchanged start.
 * What was dropped is not lost to the model: the running brief is restated in
 * the <context> block of every customer message.
 */
export function windowHistory(history: ChatMessage[], maxChars: number, step = 3): ChatMessage[] {
    const sizes = history.map((message) => JSON.stringify(message).length);
    const total = sizes.reduce((sum, size) => sum + size, 0);
    if (total <= maxChars) return history;

    const turnStarts = history.flatMap((message, index) => (message.role === "user" ? [index] : []));
    if (turnStarts.length === 0) return history;

    // Size of everything from each turn start to the end.
    const suffix = new Array<number>(history.length + 1).fill(0);
    for (let index = history.length - 1; index >= 0; index--) suffix[index] = suffix[index + 1] + sizes[index];

    // Earliest turn, on a step boundary, from which the rest fits.
    for (let turn = 0; turn < turnStarts.length; turn += step) {
        if (suffix[turnStarts[turn]] <= maxChars) return history.slice(turnStarts[turn]);
    }
    // Nothing on a boundary fits: take as many of the latest turns as do, and always the last one.
    for (const start of turnStarts) {
        if (suffix[start] <= maxChars) return history.slice(start);
    }
    return history.slice(turnStarts[turnStarts.length - 1]);
}
