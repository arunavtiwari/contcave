import { coverageArea } from "@/lib/listing/cityPaths";
import type { Faq } from "@/types/faq";

export const homeFaqs = (liveIn: string[]): Faq[] => [
  {
    question: "How does ContCave work?",
    answer: "Browse studios, compare them, and book the space that fits your shoot. Verified studios are confirmed by their owners: pricing, availability and details are kept up to date, and you can book and pay instantly. Curated studios are spaces our team has found and compiled from public information so you can discover more options; their details aren't yet confirmed by the owner, so you enquire and we check pricing and availability for you. Once you book, we handle coordination through to shoot day.",
  },
  {
    question: "What types of studios are available on ContCave?",
    answer: "We list photography studios, video production spaces, podcast and interview rooms, lifestyle and fashion studios, product photography setups, cyclorama and infinity wall spaces, vintage and themed sets, and event-ready creative spaces. Studios are tagged by shoot type, and AI search lets you describe your shoot in your own words to find exactly what it needs.",
  },
  {
    question: "Which cities is ContCave available in?",
    answer: `Studios are live ${coverageArea(liveIn)}. If you are looking for a space in a city we are not yet in, reach out - we may be able to help.`,
  },
  {
    question: "I'm a brand or agency, can ContCave handle studio bookings for our campaigns?",
    answer: "Yes. Describe your shoot in AI search for an instant shortlist, or send us your shoot details - space type, date, team size, aesthetic - and we will recommend verified studios from our network that fit. We handle the booking and logistics so your team does not have to. Reach out directly at info@contcave.com or message us on WhatsApp.",
  },
  {
    question: "How do I list my studio on ContCave?",
    answer: "Click 'List Your Studio' and share your space details with us. Our team will review the space, visit if needed, and get it live on the platform. There is no listing fee - we earn a small commission only when a confirmed booking happens.",
  },
];
