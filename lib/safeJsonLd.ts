export function safeJsonLd(data: unknown): string {
    // Stringify the data and safely escape sequence characters that might break out of the script tag
    // By preventing </script> and other tags, we reduce the risk of XSS within JSON-LD parsing.
    return JSON.stringify(data).replace(/</g, '\\u003c');
}
