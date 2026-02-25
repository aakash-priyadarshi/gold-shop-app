export default function RfqCreateLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 animate-pulse">
      {/* Header skeleton */}
      <header className="sticky top-0 z-50 border-b bg-white/80 dark:bg-gray-950/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="h-8 w-32 rounded bg-gray-200 dark:bg-gray-800" />
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Step indicator skeleton */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-800" />
              {i < 5 && <div className="h-0.5 w-12 bg-gray-200 dark:bg-gray-800" />}
            </div>
          ))}
        </div>

        {/* Form skeleton */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border p-6 lg:p-8 space-y-6">
          <div className="h-8 w-48 rounded bg-gray-200 dark:bg-gray-800" />
          <div className="h-4 w-72 rounded bg-gray-200/60 dark:bg-gray-800/60" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-800" />
              <div className="h-10 w-full rounded-lg bg-gray-100 dark:bg-gray-800/50" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-800" />
              <div className="h-10 w-full rounded-lg bg-gray-100 dark:bg-gray-800/50" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-32 w-full rounded-lg bg-gray-100 dark:bg-gray-800/50" />
          </div>
        </div>
      </div>
    </div>
  );
}
