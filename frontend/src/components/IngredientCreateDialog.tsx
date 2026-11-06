"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { IngredientForm } from "@/components/IngredientForm";
import { Button, ErrorBanner, Field, FormMessage, Input, LoadingBlock, Modal } from "@/components/ui";
import { api } from "@/lib/api";
import { quantityLabel, STORAGE_LABEL } from "@/lib/format";
import type { Category, Ingredient, IngredientInput, QuickTemplate } from "@/lib/types";

type Draft = Partial<Ingredient> & {
  name: string;
  categoryId: string;
  quantity: number;
  unit: string;
  storageType: Ingredient["storageType"];
};

export function IngredientCreateDialog({
  open,
  onClose,
  onCreated,
  initial,
  showTemplates = true,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (item: Ingredient) => void;
  initial?: Partial<Ingredient>;
  showTemplates?: boolean;
}) {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [templates, setTemplates] = useState<QuickTemplate[]>([]);
  const [draft, setDraft] = useState<Partial<Ingredient> | undefined>(initial);
  const [quickMode, setQuickMode] = useState(false);
  const [expirationDate, setExpirationDate] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");

  useEffect(() => {
    if (!open) return;
    setDraft(initial);
    setQuickMode(Boolean(initial?.name && initial?.categoryId && initial?.unit && initial?.storageType));
    setExpirationDate("");
    setFieldError("");
    setError("");
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setCategories(null);
    api
      .categories()
      .then((items) => {
        if (active) setCategories(items);
      })
      .catch((reason: Error) => {
        if (active) setError(reason.message);
      });
    if (showTemplates) {
      api
        .quickTemplates()
        .then((items) => {
          if (active) setTemplates(items);
        })
        .catch(() => {
          if (active) setTemplates([]);
        });
    } else {
      setTemplates([]);
    }
    return () => {
      active = false;
    };
  }, [open, showTemplates]);

  if (!open) return null;

  function selectTemplate(template: QuickTemplate) {
    setDraft({
      name: template.name,
      categoryId: template.categoryId,
      quantity: template.quantity,
      unit: template.unit,
      storageType: template.storageType,
      purchasedAt: null,
      expirationDate: null,
      memo: null,
    });
    setQuickMode(true);
    setExpirationDate("");
    setFieldError("");
  }

  async function onSubmit(values: IngredientInput) {
    const created = await api.createIngredient(values);
    onCreated?.(created);
    onClose();
  }

  async function submitQuick(event: React.FormEvent) {
    event.preventDefault();
    if (!draft?.name || !draft.categoryId || !draft.unit || !draft.storageType || !draft.quantity) return;
    setPending(true);
    setFieldError("");
    setError("");
    try {
      await onSubmit({
        name: draft.name,
        categoryId: draft.categoryId,
        quantity: draft.quantity,
        unit: draft.unit,
        storageType: draft.storageType,
        purchasedAt: null,
        expirationDate: expirationDate || null,
        memo: null,
      });
    } catch (reason) {
      setError((reason as Error).message || "등록하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  const quickDraft = draft as Draft | undefined;
  const canQuick =
    quickMode &&
    quickDraft &&
    Boolean(quickDraft.name && quickDraft.categoryId && quickDraft.unit && quickDraft.storageType && quickDraft.quantity);

  return (
    <Modal
      titleId="ingredient-create-title"
      onClose={onClose}
      panelClassName="flex max-h-[90vh] w-full max-w-2xl cursor-default flex-col overflow-hidden rounded-3xl bg-white shadow-xl"
    >
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 md:px-7 md:py-5">
        <div className="min-w-0 pr-2">
          <h2 id="ingredient-create-title" className="flex items-center gap-2 text-lg font-semibold text-slate-800">
            <Plus className="size-5 text-brand" />
            {canQuick ? "빠른 재등록" : "식재료 등록"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {canQuick
              ? "유통기한만 입력하면 바로 등록됩니다. 비워 두면 기한 미정으로 저장됩니다."
              : "이름, 수량, 보관 장소는 필수이며, 자주 쓰는 재료는 아래에서 바로 고를 수 있습니다."}
          </p>
        </div>
        <Button type="button" variant="quiet" size="icon" aria-label="닫기" onClick={onClose}>
          <X />
        </Button>
      </header>

      {error ? (
        <div className="shrink-0 px-5 pt-4 md:px-7">
          <ErrorBanner message={error} />
        </div>
      ) : null}
      {!categories && !error ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-7">
          <LoadingBlock label="카테고리를 불러오는 중..." />
        </div>
      ) : null}
      {categories ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          {showTemplates ? (
            <div className="border-b border-slate-100 px-5 py-4 md:px-7">
              <p className="text-sm font-semibold text-slate-800">빠른 재등록</p>
              {templates.length === 0 ? (
                <p className="mt-2 text-sm text-muted">아직 재등록할 이력이 없습니다. 식재료를 등록·소비하면 여기에 모입니다.</p>
              ) : (
                <>
                  <p className="mt-1 text-xs text-muted">재료를 고르면 유통기한만 묻는 짧은 화면으로 바뀝니다.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {templates.map((template) => (
                      <Button
                        key={`${template.name}-${template.categoryId}-${template.unit}-${template.storageType}`}
                        type="button"
                        variant="chip"
                        selected={
                          draft?.name === template.name &&
                          draft?.categoryId === template.categoryId &&
                          draft?.unit === template.unit &&
                          draft?.storageType === template.storageType
                        }
                        onClick={() => selectTemplate(template)}
                      >
                        {template.name}
                        <span className="ml-1 text-xs opacity-70">
                          {quantityLabel(template.quantity, template.unit)} · {STORAGE_LABEL[template.storageType]}
                          {template.count > 1 ? ` · ${template.count}회` : ""}
                        </span>
                      </Button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : null}

          {canQuick && quickDraft ? (
            <form onSubmit={submitQuick} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 md:px-7">
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                  <p className="font-medium text-slate-800">{quickDraft.name}</p>
                  <p className="mt-1 text-muted">
                    {quantityLabel(quickDraft.quantity, quickDraft.unit)} · {STORAGE_LABEL[quickDraft.storageType]}
                    {categories.find((category) => category.id === quickDraft.categoryId)
                      ? ` · ${categories.find((category) => category.id === quickDraft.categoryId)?.name}`
                      : ""}
                  </p>
                </div>
                <Field label="유통기한" error={fieldError} hint="모르면 비워 두세요.">
                  <Input type="date" value={expirationDate} onChange={(event) => setExpirationDate(event.target.value)} />
                </Field>
                <FormMessage>다른 항목을 바꾸려면 전체 입력으로 전환하세요.</FormMessage>
              </div>
              <div className="flex shrink-0 flex-wrap justify-between gap-2 border-t border-slate-100 bg-white px-5 py-4 md:px-7">
                <Button type="button" variant="quiet" onClick={() => setQuickMode(false)}>
                  전체 입력
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={onClose}>
                    취소
                  </Button>
                  <Button type="submit" disabled={pending}>
                    {pending ? "등록 중..." : "등록"}
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            <IngredientForm
              key={[draft?.name, draft?.categoryId, draft?.unit, draft?.storageType, draft?.quantity, quickMode ? "full" : "base"].join("|")}
              categories={categories}
              initial={draft}
              submitLabel="등록"
              embedded
              onCancel={onClose}
              onSubmit={onSubmit}
            />
          )}
        </div>
      ) : null}
    </Modal>
  );
}
