// components/home/skeletons/ChaptersListSkeleton.tsx

export default function ChaptersListSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
      <div className="h-8 w-40 bg-neutral-800/50 rounded mb-8 animate-pulse" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-16 bg-neutral-800/30 rounded-lg animate-pulse"
            style={{ animationDelay: `${i * 50}ms` }}
          />
        ))}
      </div>
    </div>
  );
}