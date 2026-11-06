import { Suspense } from "react";
import type { Metadata } from "next";
import { IngredientListView } from "@/components/IngredientListView";
import { LoadingBlock } from "@/components/ui";

export const metadata: Metadata = { title: "소비 완료" };

export default function ConsumedPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <IngredientListView mode="consumed" />
    </Suspense>
  );
}
