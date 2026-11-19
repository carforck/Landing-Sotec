import { MarcoTienda } from "@/components/tienda/MarcoTienda";

export default function LayoutTienda({ children }: { children: React.ReactNode }) {
  return <MarcoTienda>{children}</MarcoTienda>;
}
