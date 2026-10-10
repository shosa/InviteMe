import { Nav } from "@/components/Nav";
import { AuthForm } from "@/components/AuthForm";
import { apiPublic } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function Accedi({ searchParams }: { searchParams: Promise<{ tab?: string; next?: string; error?: string }> }) {
  const sp = await searchParams;
  const mode = sp.tab === "register" ? "register" : "login";
  const next = typeof sp.next === "string" && /^\/[a-zA-Z]/.test(sp.next) ? sp.next : "/account";
  const cat = await apiPublic<{ google?: boolean }>("/api/catalog");
  return (
    <>
      <Nav />
      <main className="auth-page">
        <div className="auth-card">
          <AuthForm initialMode={mode} next={next} google={!!cat?.google} googleError={sp.error === "google"} />
        </div>
      </main>
    </>
  );
}
