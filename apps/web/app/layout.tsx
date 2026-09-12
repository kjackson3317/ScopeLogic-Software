import type { Metadata } from "next";
import "./globals.css";import "./globals-batch-2.css";import "./globals-batch-3.css";import "./globals-batch-5.css";import "./globals-batch-6.css";import "./globals-batch-7.css";import "./globals-batch-8.css";import "./globals-batch-9.css";
export const metadata:Metadata={title:{default:"ScopeLogic",template:"%s | ScopeLogic"},description:"Construction estimating and preconstruction software."};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
