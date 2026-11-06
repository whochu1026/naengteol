import type { Metadata } from "next";
import { IngredientCreateView } from "@/components/IngredientCreateView";

export const metadata: Metadata = { title: "식재료 등록" };

export default function NewIngredientPage() {
  return <IngredientCreateView />;
}
