import { Card, CardContent, CardHeader } from "@/components/ui/card";

function Shimmer({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-muted ${className || ""}`} />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6" data-testid="dashboard-skeleton">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Shimmer className="h-7 w-48 mb-2" />
          <Shimmer className="h-4 w-72" />
        </div>
        <div className="flex items-center gap-2">
          <Shimmer className="h-9 w-24 rounded-md" />
          <Shimmer className="h-9 w-9 rounded-md" />
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
              <Shimmer className="h-4 w-24" />
              <Shimmer className="h-8 w-8 rounded-md" />
            </CardHeader>
            <CardContent>
              <Shimmer className="h-8 w-20 mb-2" />
              <Shimmer className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Shimmer className="h-10 w-full max-w-lg rounded-md" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <Shimmer className="h-5 w-32 mb-1" />
            <Shimmer className="h-3 w-48" />
          </CardHeader>
          <CardContent>
            <Shimmer className="h-[200px] w-full rounded-md" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Shimmer className="h-5 w-32 mb-1" />
            <Shimmer className="h-3 w-48" />
          </CardHeader>
          <CardContent>
            <Shimmer className="h-[200px] w-full rounded-md" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function A2ASkeleton() {
  return (
    <div className="flex h-screen w-full" data-testid="a2a-skeleton">
      <div className="w-[18rem] border-r p-4 space-y-4 hidden md:block">
        <Shimmer className="h-9 w-full rounded-md" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Shimmer key={i} className="h-10 w-full rounded-md" />
          ))}
        </div>
        <Shimmer className="h-px w-full" />
        <Shimmer className="h-4 w-20" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Shimmer key={i} className="h-8 w-full rounded-md" />
          ))}
        </div>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between p-2 border-b gap-2">
          <div className="flex items-center gap-2">
            <Shimmer className="h-8 w-8 rounded-md" />
            <Shimmer className="h-4 w-32" />
          </div>
          <div className="flex items-center gap-2">
            <Shimmer className="h-8 w-8 rounded-md" />
            <Shimmer className="h-8 w-8 rounded-md" />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Shimmer className="h-16 w-16 rounded-full mx-auto" />
            <Shimmer className="h-6 w-48 mx-auto" />
            <Shimmer className="h-4 w-64 mx-auto" />
          </div>
        </div>
        <div className="border-t p-3">
          <div className="max-w-3xl mx-auto flex gap-2">
            <Shimmer className="h-11 flex-1 rounded-md" />
            <Shimmer className="h-9 w-9 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
