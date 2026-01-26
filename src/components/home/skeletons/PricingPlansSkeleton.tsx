// components/home/skeletons/PricingPlansSkeleton.tsx

export default function PricingPlansSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-20">
      <div className="h-8 w-48 bg-neutral-800/50 rounded mx-auto mb-4 animate-pulse" />
      <div className="h-4 w-64 bg-neutral-800/30 rounded mx-auto mb-12 animate-pulse" />
      <div className="grid md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-80 bg-neutral-800/30 rounded-xl animate-pulse"
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>
    </div>
  );
}