import type { Metadata } from "next";
import { AccountView } from "@/components/AccountView";

export const metadata: Metadata = { title: "마이페이지" };

export default function AccountPage() {
  return <AccountView />;
}
