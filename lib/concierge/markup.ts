/**
 * Hides model-internal markup from the customer while text streams. Open
 * models sometimes write their reasoning inside <think> tags, or a tool call
 * as <tool_call> text, straight into the reply; neither is for the customer.
 * A possible tag start is held back until it is clear what it is.
 */
export class MarkupFilter {
    private buffer = "";
    private hidden: string | null = null;
    private static readonly TAGS = ["think", "tool_call", "tools", "function_call"];

    push(delta: string): string {
        this.buffer += delta;
        let out = "";
        for (;;) {
            if (this.hidden) {
                const close = this.buffer.indexOf(`</${this.hidden}>`);
                if (close < 0) {
                    // Keep only enough to recognise the closing tag when it completes.
                    this.buffer = this.buffer.slice(-(this.hidden.length + 3));
                    return out;
                }
                this.buffer = this.buffer.slice(close + this.hidden.length + 3);
                this.hidden = null;
                continue;
            }
            const open = this.buffer.indexOf("<");
            if (open < 0) {
                out += this.buffer;
                this.buffer = "";
                return out;
            }
            out += this.buffer.slice(0, open);
            this.buffer = this.buffer.slice(open);
            const tag = MarkupFilter.TAGS.find((name) => this.buffer.startsWith(`<${name}>`));
            if (tag) {
                this.hidden = tag;
                this.buffer = this.buffer.slice(tag.length + 2);
                continue;
            }
            // Could this still become one of the tags? Then wait for more text.
            if (MarkupFilter.TAGS.some((name) => `<${name}>`.startsWith(this.buffer))) return out;
            out += this.buffer[0];
            this.buffer = this.buffer.slice(1);
        }
    }

    /** At the end of a reply: anything held back that never became a tag is ordinary text. */
    flush(): string {
        const rest = this.hidden ? "" : this.buffer;
        this.buffer = "";
        this.hidden = null;
        return rest;
    }
}

export const stripMarkup = (text: string) => {
    const filter = new MarkupFilter();
    return (filter.push(text) + filter.flush()).trim();
};
