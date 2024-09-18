export type Author = {
  name: string;
  image: any;
  bio?: string;
  _id?: number | string;
  _ref?: number | string;
};

export type Body = {
  start: string;
  main: string;
  end?: string;
  _id?: number | string;
  _ref?: number | string;
};

export type Blog = {
  _id: number;
  title: string;
  slug?: any;
  metadata?: string;
  category?: string;
  body?: Body;
  mainImage?: any;
  author?: Author;
  tags?: string[];
  publishedAt?: string;
  related_posts?: number[];
};
