import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "ORIGIN — Research Workspace",
  description: "A scientific research workspace for source-traceable investigations.",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
