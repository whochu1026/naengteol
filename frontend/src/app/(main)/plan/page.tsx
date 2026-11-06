import { Suspense } from "react";
import type { Metadata } from "next";
import { PlanView } from "@/components/PlanView";
import { LoadingBlock } from "@/components/ui";

export const metadata: Metadata = { title: "먹을 것" };

export default function PlanPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <PlanView />
    </Suspense>
  );
}
