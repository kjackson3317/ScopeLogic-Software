import type { Metadata } from "next";
import "./globals.css";
import "./globals-batch-2.css";

export const metadata: Metadata = {
  title: {
    default: "ScopeLogic",
    template: "%s | ScopeLogic"
  },
  description: "Construction estimating and preconstruction software."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
