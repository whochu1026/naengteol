import type { Metadata } from "next";
import { LoginForm } from "@/components/AuthForms";

export const metadata: Metadata = { title: "로그인" };

export default function LoginPage() {
  return <LoginForm />;
}
