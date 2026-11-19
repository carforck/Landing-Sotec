import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";

import { ProveedorTienda } from "@/components/Proveedor";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--fuente", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--fuente-titulo", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://sotecse.com"),
  title: { default: "Tienda virtual · SOTEC", template: "%s · Tienda SOTEC" },
  description: "Energía solar, seguridad electrónica, CCTV, redes y automatización. Arma tu pedido y cotízalo por WhatsApp con SOTEC.",
  // Next 14 no antepone el basePath al manifest generado: ruta explícita (public/manifest.webmanifest)
  manifest: "/tienda/manifest.webmanifest",
  openGraph: { title: "Tienda virtual · SOTEC", description: "Arma tu pedido y cotízalo por WhatsApp.", url: "https://sotecse.com/tienda", siteName: "SOTEC", locale: "es_CO", type: "website" },
};

export const viewport: Viewport = { themeColor: "#2c840b", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO" className={`${inter.variable} ${manrope.variable}`}>
      <body>
        <ProveedorTienda>{children}</ProveedorTienda>
      </body>
    </html>
  );
}
