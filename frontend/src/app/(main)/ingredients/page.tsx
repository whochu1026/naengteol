import { Suspense } from "react";
import type { Metadata } from "next";
import { IngredientListView } from "@/components/IngredientListView";
import { LoadingBlock } from "@/components/ui";

export const metadata: Metadata = { title: "식재료" };

export default function IngredientsPage() {
  return (
    <Suspense fallback={<LoadingBlock />}>
      <IngredientListView />
    </Suspense>
  );
}
