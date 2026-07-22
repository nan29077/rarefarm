import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-white md:bg-neutral-100">
      <div className="mx-auto min-h-screen w-full max-w-app bg-white md:my-0 md:shadow-xl">
        <LoginForm />
      </div>
    </main>
  );
}
