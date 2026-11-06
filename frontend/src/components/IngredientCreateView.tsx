"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoadingBlock } from "@/components/ui";

export function IngredientCreateView() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/ingredients?create=1");
  }, [router]);

  return <LoadingBlock label="등록 화면으로 이동 중..." />;
}
