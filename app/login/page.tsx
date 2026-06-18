import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  // Signed-in users are redirected to "/" by middleware before reaching here.
  return <LoginForm />;
}
