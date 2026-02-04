import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "anatomy",
  description: "Visual editor for AI agent configuration files",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/mak8uic.css" />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
