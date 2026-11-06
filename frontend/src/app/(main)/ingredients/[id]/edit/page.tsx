import type { Metadata } from "next";
import { IngredientEditView } from "@/components/IngredientEditView";

export const metadata: Metadata = { title: "식재료 수정" };

export default async function EditIngredientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <IngredientEditView id={id} />;
}
