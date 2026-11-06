import type { Metadata } from "next";
import { TrashView } from "@/components/TrashView";

export const metadata: Metadata = { title: "휴지통" };

export default function TrashPage() {
  return <TrashView />;
}
