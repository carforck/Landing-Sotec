import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/tienda", disallow: ["/tienda/admin"] }], sitemap: "https://sotecse.com/tienda/sitemap.xml" };
}
