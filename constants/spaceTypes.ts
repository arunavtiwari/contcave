export const spaceTypes = [
  "Fashion shoot",
  "Product shoot",
  "Podcast",
  "Recording Studio",
  "Film Shoot",
  "Outdoor Event",
  "Content shoot",
  "Pre-Wedding",
  "Meetings",
  "Workshops",
  "Photo Shoot",
] as const;

export type SpaceType = (typeof spaceTypes)[number];
