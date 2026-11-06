"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { IngredientForm } from "@/components/IngredientForm";
import { ErrorBanner, LoadingBlock, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import type { Category, Ingredient, IngredientInput } from "@/lib/types";

export function IngredientEditView({ id }: { id: string }) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [item, setItem] = useState<Ingredient | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.categories(), api.ingredient(id)])
      .then(([nextCategories, nextItem]) => {
        setCategories(nextCategories);
        setItem(nextItem);
      })
      .catch((reason: Error) => setError(reason.message));
  }, [id]);

  async function onSubmit(values: IngredientInput) {
    await api.updateIngredient(id, values);
    router.replace(`/ingredients/${id}`);
  }

  return (
    <div className="grid gap-6">
      <PageHeader title="식재료 수정" description={item ? item.name : "등록 정보를 수정합니다."} />
      {error ? <ErrorBanner message={error} /> : null}
      {!item || !categories ? error ? null : <LoadingBlock /> : (
        <IngredientForm
          categories={categories}
          initial={item}
          submitLabel="저장"
          cancelHref={`/ingredients/${id}`}
          onSubmit={onSubmit}
        />
      )}
    </div>
  );
}
