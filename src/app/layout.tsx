import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "KEPLER MIND — Explore the unknown",
  description: "Explore the unknown. Understand the universe. ORIGIN is the scientific research workspace inside KEPLER MIND.",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
