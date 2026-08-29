import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Panboy — Event PUBG Mobile",
  description: "Semua event PUBG Mobile ada di sini.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
