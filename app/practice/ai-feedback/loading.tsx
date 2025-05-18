import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="container px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Skeleton className="h-4 w-24 mb-4" />
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>

      <Skeleton className="h-32 mb-6" />

      <div className="grid gap-6 md:grid-cols-2 mb-6">
        <Skeleton className="aspect-video" />
        <Skeleton className="h-full" />
      </div>

      <Skeleton className="h-8 w-64 mb-6" />
      <Skeleton className="h-[400px] mb-6" />
    </div>
  )
}
