import { Blog } from "@/types/blog";

const BlogData: Blog[] = [
  {
    _id: 1,
    mainImage: "/images/blog/blog-01.png",
    title: "Free advertising for your online business",
    metadata:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit convallis tortor.",
    author: { name: "author 1", image: "/images/blog/author.jpg" },
    publishedAt: "25 Aug 2024",
    body: {
      start: "Lorem ipsum odor amet, consectetuer adipiscing elit. Vestibulum magnis mauris sed congue; sed nisi ultricies phasellus posuere. Vitae odio elementum nec efficitur praesent et justo mauris. Lorem ipsum odor amet, consectetuer adipiscing elit. Vestibulum magnis mauris sed congue; sed nisi ultricies phasellus posuere. Vitae odio elementum nec efficitur praesent et justo mauris.", main: "Lorem ipsum odor amet, consectetuer adipiscing elit. Bibendum urna class auctor, felis class quisque. Hendrerit porttitor praesent luctus amet duis himenaeos mattis adipiscing. Suspendisse etiam lobortis class consequat facilisi diam? Pharetra eleifend commodo mauris dictum aliquet elit tristique varius. Maecenas phasellus maecenas consequat lobortis montes ac justo. Lacus mattis lectus pharetra amet donec etiam. Cubilia eleifend nulla mattis sociosqu semper ipsum feugiat porta adipiscing. Sit sagittis tempor in nascetur et ante egestas torquent. Egestas nunc malesuada imperdiet habitant auctor. Auctor nullam a volutpat lobortis; elementum placerat vivamus. Donec ultricies venenatis lacinia ante maecenas.", end: "Lorem ipsum dolor sit amet, consectetur adipiscing elit convallis tortor."
    },
    related_posts: [4, 5, 6],
    tags: ["tag 1", "tag 2"]

  },
  {
    _id: 2,
    mainImage: "/images/blog/blog-02.png",
    title: "9 simple ways to improve your design skills",
    metadata:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit convallis tortor.",
    author: { "name": "author 2", "image": "" },
    publishedAt: "25 Aug 2024",
    body: {
      start: "Lorem ipsum odor amet, consectetuer adipiscing elit. Vestibulum magnis mauris sed congue; sed nisi ultricies phasellus posuere. Vitae odio elementum nec efficitur praesent et justo mauris. Lorem ipsum odor amet, consectetuer adipiscing elit. Vestibulum magnis mauris sed congue; sed nisi ultricies phasellus posuere. Vitae odio elementum nec efficitur praesent et justo mauris.", main: "Lorem ipsum odor amet, consectetuer adipiscing elit. Bibendum urna class auctor, felis class quisque. Hendrerit porttitor praesent luctus amet duis himenaeos mattis adipiscing. Suspendisse etiam lobortis class consequat facilisi diam? Pharetra eleifend commodo mauris dictum aliquet elit tristique varius. Maecenas phasellus maecenas consequat lobortis montes ac justo. Lacus mattis lectus pharetra amet donec etiam. Cubilia eleifend nulla mattis sociosqu semper ipsum feugiat porta adipiscing. Sit sagittis tempor in nascetur et ante egestas torquent. Egestas nunc malesuada imperdiet habitant auctor. Auctor nullam a volutpat lobortis; elementum placerat vivamus. Donec ultricies venenatis lacinia ante maecenas.", end: "Lorem ipsum dolor sit amet, consectetur adipiscing elit convallis tortor."
    }
  },
  {
    _id: 3,
    mainImage: "/images/blog/blog-03.png",
    title: "Tips to quickly improve your coding speed.",
    metadata:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit convallis tortor.",
    author: { "name": "author 3", "image": "" },
    publishedAt: "25 Aug 2024",
    body: {
      start: "Lorem ipsum odor amet, consectetuer adipiscing elit. Vestibulum magnis mauris sed congue; sed nisi ultricies phasellus posuere. Vitae odio elementum nec efficitur praesent et justo mauris. Lorem ipsum odor amet, consectetuer adipiscing elit. Vestibulum magnis mauris sed congue; sed nisi ultricies phasellus posuere. Vitae odio elementum nec efficitur praesent et justo mauris.", main: "Lorem ipsum odor amet, consectetuer adipiscing elit. Bibendum urna class auctor, felis class quisque. Hendrerit porttitor praesent luctus amet duis himenaeos mattis adipiscing. Suspendisse etiam lobortis class consequat facilisi diam? Pharetra eleifend commodo mauris dictum aliquet elit tristique varius. Maecenas phasellus maecenas consequat lobortis montes ac justo. Lacus mattis lectus pharetra amet donec etiam. Cubilia eleifend nulla mattis sociosqu semper ipsum feugiat porta adipiscing. Sit sagittis tempor in nascetur et ante egestas torquent. Egestas nunc malesuada imperdiet habitant auctor. Auctor nullam a volutpat lobortis; elementum placerat vivamus. Donec ultricies venenatis lacinia ante maecenas.", end: "Lorem ipsum dolor sit amet, consectetur adipiscing elit convallis tortor."
    },
  },
  {
    _id: 4,
    mainImage: "/images/blog/blog-03.png",
    title: "Free advertising for your online business",
    metadata:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit convallis tortor.",
  },
  {
    _id: 5,
    mainImage: "/images/blog/blog-04.png",
    title: "9 simple ways to improve your design skills",
    metadata:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit convallis tortor.",
  },
  {
    _id: 6,
    mainImage: "/images/blog/blog-01.png",
    title: "Tips to quickly improve your coding speed.",
    metadata:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit convallis tortor.",
  },
];

export default BlogData;
