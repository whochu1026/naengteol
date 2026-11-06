import type { Metadata } from "next";
import { IngredientDetailView } from "@/components/IngredientDetailView";

export const metadata: Metadata = { title: "식재료 상세" };

export default async function IngredientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <IngredientDetailView id={id} />;
}
