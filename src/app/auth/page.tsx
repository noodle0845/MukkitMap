import { Suspense } from "react";
import { AuthPage } from "@/components/AuthPage";

export default function AuthRoute() {
  return (
    <Suspense>
      <AuthPage />
    </Suspense>
  );
}
