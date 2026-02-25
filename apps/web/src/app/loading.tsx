export default function HomeLoading() {
  return (
    <div className="flex min-h-screen flex-col animate-pulse">
      {/* Header skeleton */}
      <header className="sticky top-0 z-50 border-b bg-white/80 dark:bg-gray-950/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="h-8 w-32 rounded bg-gray-200 dark:bg-gray-800" />
          <div className="hidden md:flex items-center gap-4">
            <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-800" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-20 rounded-lg bg-gray-200 dark:bg-gray-800" />
            <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>
      </header>

      {/* Hero skeleton */}
      <section className="relative min-h-[600px] lg:min-h-[700px] bg-gradient-to-b from-gold-50 via-amber-50/50 to-white dark:from-gray-900 dark:via-gray-900/50 dark:to-gray-950">
        <div className="container mx-auto px-4 py-12 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="space-y-6 text-center lg:text-left">
              <div className="h-8 w-64 rounded-full bg-gray-200/60 dark:bg-gray-800/60 mx-auto lg:mx-0" />
              <div className="space-y-3">
                <div className="h-10 w-full rounded bg-gray-200/60 dark:bg-gray-800/60" />
                <div className="h-10 w-3/4 rounded bg-gray-200/60 dark:bg-gray-800/60" />
              </div>
              <div className="h-5 w-full max-w-lg rounded bg-gray-200/40 dark:bg-gray-800/40 mx-auto lg:mx-0" />
              <div className="flex gap-3 justify-center lg:justify-start">
                <div className="h-12 w-40 rounded-xl bg-gray-200/60 dark:bg-gray-800/60" />
                <div className="h-12 w-36 rounded-xl bg-gray-200/40 dark:bg-gray-800/40" />
              </div>
            </div>
            <div className="h-80 rounded-2xl bg-gray-200/40 dark:bg-gray-800/40" />
          </div>
        </div>
      </section>
    </div>
  );
}
