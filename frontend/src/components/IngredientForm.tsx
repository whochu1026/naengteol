"use client";

import { useState } from "react";
import type { Category, Ingredient, IngredientInput, StorageType } from "@/lib/types";
import { STORAGE_LABEL, UNITS } from "@/lib/format";
import { fieldMessage } from "@/lib/api";
import type { FieldError } from "@/lib/types";
import { Button, Field, Input, Select, TextArea, cardClass } from "@/components/ui";

const storages = Object.entries(STORAGE_LABEL) as [StorageType, string][];

export function IngredientForm({
  categories,
  initial,
  submitLabel,
  cancelHref,
  onCancel,
  embedded = false,
  onSubmit,
}: {
  categories: Category[];
  initial?: Partial<Ingredient>;
  submitLabel: string;
  cancelHref?: string;
  onCancel?: () => void;
  embedded?: boolean;
  onSubmit: (values: IngredientInput) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? categories[0]?.id ?? "");
  const [quantity, setQuantity] = useState(initial?.quantity?.toString() ?? "");
  const initialUnit = initial?.unit ?? "개";
  const [unit, setUnit] = useState(UNITS.includes(initialUnit) ? initialUnit : "custom");
  const [customUnit, setCustomUnit] = useState(UNITS.includes(initialUnit) ? "" : initialUnit);
  const [purchasedAt, setPurchasedAt] = useState(initial?.purchasedAt ?? "");
  const [expirationDate, setExpirationDate] = useState(initial?.expirationDate ?? "");
  const [storageType, setStorageType] = useState<StorageType>(initial?.storageType ?? "REFRIGERATED");
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: FieldError[] = [];
    const parsedQuantity = Number(quantity);
    if (!name.trim()) nextErrors.push({ field: "name", message: "식재료명을 입력해 주세요." });
    if (!categoryId) nextErrors.push({ field: "categoryId", message: "카테고리를 선택해 주세요." });
    if (!quantity || Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
      nextErrors.push({ field: "quantity", message: "수량은 0보다 커야 합니다." });
    }
    const resolvedUnit = unit === "custom" ? customUnit.trim() : unit;
    if (!resolvedUnit) nextErrors.push({ field: "unit", message: "단위를 입력해 주세요." });
    if (purchasedAt && expirationDate && expirationDate < purchasedAt) {
      nextErrors.push({ field: "expirationDate", message: "유통기한은 구매일보다 빠를 수 없습니다." });
    }
    setErrors(nextErrors);
    if (nextErrors.length > 0) return;

    setPending(true);
    setMessage("");
    try {
      await onSubmit({
        name: name.trim(),
        categoryId,
        quantity: parsedQuantity,
        unit: resolvedUnit,
        purchasedAt: purchasedAt || null,
        expirationDate: expirationDate || null,
        storageType,
        memo: memo.trim() || null,
      });
    } catch (error) {
      const apiErrors = (error as { errors?: FieldError[]; message?: string }).errors;
      setErrors(apiErrors ?? []);
      setMessage((error as { message?: string }).message || "저장하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  const fields = (
    <>
      {message ? <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p> : null}
      <div className="grid gap-4">
        <Field label="식재료명" error={fieldMessage(errors, "name")} required>
          <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="카테고리" error={fieldMessage(errors, "categoryId")} required>
            <Select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="보관 장소" error={fieldMessage(errors, "storageType")} required>
            <Select value={storageType} onChange={(event) => setStorageType(event.target.value as StorageType)}>
              {storages.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="수량" error={fieldMessage(errors, "quantity")} required>
            <Input inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
          </Field>
          <Field label="단위" error={fieldMessage(errors, "unit")} required>
            <Select value={UNITS.includes(unit) ? unit : "custom"} onChange={(event) => setUnit(event.target.value)}>
              {UNITS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
              <option value="custom">직접 입력</option>
            </Select>
          </Field>
        </div>
        {unit === "custom" ? (
          <Field label="단위 직접 입력" error={fieldMessage(errors, "unit")}>
            <Input value={customUnit} onChange={(event) => setCustomUnit(event.target.value)} maxLength={20} />
          </Field>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="구매일" error={fieldMessage(errors, "purchasedAt")}>
            <Input type="date" value={purchasedAt} onChange={(event) => setPurchasedAt(event.target.value)} />
          </Field>
          <Field label="유통기한" error={fieldMessage(errors, "expirationDate")}>
            <Input type="date" value={expirationDate} onChange={(event) => setExpirationDate(event.target.value)} />
          </Field>
        </div>
        <Field label="메모" error={fieldMessage(errors, "memo")}>
          <TextArea className="min-h-24 resize-y" value={memo} maxLength={500} onChange={(event) => setMemo(event.target.value)} />
        </Field>
      </div>
    </>
  );

  const actions = (
    <>
      {onCancel ? (
        <Button type="button" variant="outline" onClick={onCancel}>
          취소
        </Button>
      ) : (
        <Button href={cancelHref ?? "/ingredients"} variant="outline">
          취소
        </Button>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "저장 중..." : submitLabel}
      </Button>
    </>
  );

  if (embedded) {
    return (
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-7">{fields}</div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 bg-white px-5 py-4 md:px-7">{actions}</div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`${cardClass} mx-auto max-w-2xl p-5 md:p-7`}>
      {fields}
      <div className="mt-6 flex justify-end gap-2">{actions}</div>
    </form>
  );
}
