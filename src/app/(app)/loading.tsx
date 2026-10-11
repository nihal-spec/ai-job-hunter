import { SkeletonList } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-8">
      <SkeletonList rows={4} />
    </main>
  );
}
