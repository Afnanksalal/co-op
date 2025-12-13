export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="h-10 w-64 bg-muted rounded animate-pulse" />
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  );
}
