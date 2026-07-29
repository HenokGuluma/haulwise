import { StatCardsSkeleton, TableSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div>
      <StatCardsSkeleton count={3} />
      <TableSkeleton rows={8} toolbarFilters={0} />
    </div>
  );
}
