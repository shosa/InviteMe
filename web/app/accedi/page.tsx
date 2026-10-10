import { Nav } from "@/components/Nav";
import { AuthForm } from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export default async function Accedi({ searchParams }: { searchParams: Promise<{ tab?: string; next?: string }> }) {
  const sp = await searchParams;
  const mode = sp.tab === "register" ? "register" : "login";
  const next = typeof sp.next === "string" ? sp.next : "/account";
  return (
    <>
      <Nav />
      <main className="auth-page">
        <div className="auth-card">
          <AuthForm initialMode={mode} next={next} />
        </div>
      </main>
    </>
  );
}
