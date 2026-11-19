import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://sotecse.com/tienda", changeFrequency: "weekly", priority: 1 },
    { url: "https://sotecse.com/tienda/carrito", changeFrequency: "monthly", priority: 0.3 },
  ];
}
