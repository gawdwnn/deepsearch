import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { PostHogProvider } from "../components/posthog-provider";

export const metadata: Metadata = {
  title: "deepsearch ai example",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <body>
        <PostHogProvider>
          <SessionProvider>{children}</SessionProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}
