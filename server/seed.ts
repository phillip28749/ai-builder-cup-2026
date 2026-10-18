import type { State } from "../src/types.js";
export const initialState = (): State => ({
  brand: {
    name: "Habi Home",
    founder: "Maya Santos",
    tagline: "Everyday objects. Extraordinary stories.",
    story:
      "I am an independent maker in Iloilo, working with local weavers to bring thoughtful, handcrafted pieces into everyday homes.",
    mission:
      "Keep Filipino weaving traditions alive through useful, beautiful objects and fair partnerships.",
    voice:
      "Warm, thoughtful, grounded. Tell the maker’s story; avoid hard selling.",
    color: "#9c674c",
    promise:
      "For people who want a home that feels personal, with pieces that mean something.",
    guidelines: "",
  },
  audiences: [
    {
      id: "a1",
      name: "The thoughtful homemaker",
      description: "Design-conscious adults making a warm, personal home.",
      needs:
        "Authentic materials, the story behind each piece, and practical care guidance.",
    },
    {
      id: "a2",
      name: "The meaningful gift giver",
      description:
        "People looking for considered gifts that support local makers.",
      needs: "Gift-ready pieces, clear pricing, and convenient pickup.",
    },
  ],
  products: [
    {
      id: "p1",
      name: "Binakol throw blanket",
      description:
        "A soft woven throw inspired by the traditional binakol pattern. Natural cotton, 120 × 160 cm.",
      price: 1800,
      image: "blanket",
      stock: { Iloilo: 12, Manila: 4 },
    },
    {
      id: "p2",
      name: "Everyday woven tote",
      description: "An easy everyday companion, handwoven from natural fibers.",
      price: 850,
      image: "tote",
      stock: { Iloilo: 7, Manila: 0 },
    },
    {
      id: "p3",
      name: "Table stories set",
      description:
        "Four handwoven placemats for slow breakfasts and shared tables.",
      price: 1200,
      image: "table",
      stock: { Iloilo: 3, Manila: 5 },
    },
  ],
  content: [],
  conversations: [],
  orders: [],
  insights: "",
  syncedAt: null,
  sheetMode: "sample",
});
