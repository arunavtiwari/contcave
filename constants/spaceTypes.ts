export const spaceTypes = [
  "Fashion Shoot",
  "Product & E-commerce Shoot",
  "Portrait / Photoshoot",
  "Reels & Social Media Content",
  "Podcast Recording",
  "Video Production",
  "Film / Music Video Shoot",
  "Brand Campaign Shoot",
  "Pre-Wedding Shoot",
  "Interviews & YouTube Videos",
  "Workshops & Classes",
  "Meetings & Creative Sessions",
  "Events & Pop-Ups",
] as const;

export type SpaceType = (typeof spaceTypes)[number];