/**
 * Deterministic gradient cover generator for blog posts that have no
 * meta.image. Seeded by the post id so the same post always renders the
 * same gradient (stable across server/client render, no hydration
 * mismatch) while different posts land on visually distinct colors.
 */

function hashString(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getBlogGradient(seed: string): string {
  const hash = hashString(seed);
  const hue1 = hash % 360;
  const hue2 = (hue1 + 55 + (hash % 70)) % 360;
  const angle = 115 + (hash % 60);
  return `linear-gradient(${angle}deg, hsl(${hue1} 72% 52%) 0%, hsl(${hue2} 78% 42%) 100%)`;
}
