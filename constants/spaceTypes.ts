export const spaceTypes = [
  "Fashion Shoot",
  "Product & E-commerce Shoot",
  "Reels & Social Media Content",
  "Podcast Recording",
  "Video Production",
  "Film & Music Video Shoot",
  "Brand Campaign Shoot",
  "Pre-Wedding Shoot",
  "YouTube Videos",
  "Workshops & Classes",
  "Events & Pop-Ups",
] as const;

export type SpaceType = (typeof spaceTypes)[number];