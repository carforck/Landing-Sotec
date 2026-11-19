import type { Metadata } from "next";

import { PanelAdmin } from "@/components/admin/PanelAdmin";

export const metadata: Metadata = { title: "Panel", robots: { index: false, follow: false } };

export default function LayoutAdmin({ children }: { children: React.ReactNode }) {
  return <PanelAdmin>{children}</PanelAdmin>;
}
