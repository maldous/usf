import type { ReactNode } from "react";

export const metadata = {
  title: "USF bounded local app surface",
  description: "Local-only Next.js app-surface scaffold over governed USF route semantics.",
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en" data-usf-owner-issue="USF-1017">
      <body>{children}</body>
    </html>
  );
}
