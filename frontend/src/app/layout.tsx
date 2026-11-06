import type { Metadata } from "next";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "냉털",
    template: "%s · 냉털",
  },
  description: "냉장고 속 재료를 한눈에, 버리는 음식은 줄이게.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full font-sans font-normal antialiased">
        {children}
        <ScrollToTopButton />
      </body>
    </html>
  );
}
