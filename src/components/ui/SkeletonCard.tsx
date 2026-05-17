export default function SkeletonCard() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[3/4] skeleton rounded-none" />
      <div className="mt-3 px-1 space-y-2">
        <div className="h-2 skeleton w-16 rounded" />
        <div className="h-3 skeleton w-3/4 rounded" />
        <div className="h-3 skeleton w-1/3 rounded" />
      </div>
    </div>
  )
}
