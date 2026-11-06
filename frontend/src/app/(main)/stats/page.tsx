import type { Metadata } from "next";
import { StatsView } from "@/components/StatsView";

export const metadata: Metadata = { title: "통계" };

export default function StatsPage() {
  return <StatsView />;
}
