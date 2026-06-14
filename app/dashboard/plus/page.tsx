import { PlusMenu } from "@/components/plus-menu";

export const dynamic = "force-dynamic";

export default function PlusPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Plus</h1>
      <PlusMenu />
    </div>
  );
}
