import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/dashboard-nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <DashboardNav />
      {/* Extra bottom padding so content clears the mobile tab bar */}
      <main className="container max-w-3xl py-5 pb-28 md:pb-10">{children}</main>
    </div>
  );
}
