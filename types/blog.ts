// types/blog.ts

export interface Breadcrumb {
  doc: string;
  label: string;
  id: string;
}

export interface Category {
  id: string;
  title: string;
  breadcrumbs: Breadcrumb[];
  createdAt: string;
  updatedAt: string;
}

export interface RichText {
  text: string;
  bold?: boolean;
}

export interface Hero {
  type: string;
  richText: { children: RichText[] }[];
  links: string[];
}

export interface MetaImage {
  id: string;
  alt: string;
  filename: string;
  mimeType: string;
  filesize: number;
  width: number;
  height: number;
  focalX: number;
  focalY: number;
  createdAt: string;
  updatedAt: string;
  url: string;
}

export interface Meta {
  title: string;
  description: string;
  image: MetaImage;
}

export interface BlogPost {
  id: string;
  title: string;
  categories: Category[];
  publishedAt: string;
  authors: string[];
  hero: Hero;
  layout: {
    columns: any[];
    id: string;
    blockType: string;
  }[];
  slug: string;
  meta: Meta;
  _status: string;
  createdAt: string;
  updatedAt: string;
  enablePremiumContent: boolean;
  populatedAuthors: {
    id: string;
    name: string;
  }[];
  premiumContent: any[];
}
