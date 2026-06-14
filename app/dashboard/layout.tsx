import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/db/queries";
import { DashboardNav } from "@/components/dashboard-nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // New users go through the guided onboarding first.
  const profile = await getProfile(user.id);
  if (!profile.onboarded) redirect("/onboarding");

  return (
    <div className="min-h-screen">
      <DashboardNav />
      {/* Extra bottom padding so content clears the taller mobile tab bar */}
      <main className="container max-w-3xl py-5 pb-36 md:pb-10">{children}</main>
    </div>
  );
}
