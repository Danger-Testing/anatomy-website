import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anatomy of a Lobster",
  description: "Visualize your agent's anatomy.",
  metadataBase: new URL("https://anatomyoflobster.com"),
  openGraph: {
    title: "Anatomy of a Lobster",
    description: "Visualize your agent's anatomy.",
    url: "https://anatomyoflobster.com",
    siteName: "Anatomy of a Lobster",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Anatomy of a Lobster",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Anatomy of a Lobster",
    description: "Visualize your agent's anatomy.",
    images: ["/og.png"],
  },
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
      <body className="antialiased">{children}</body>
    </html>
  );
}
