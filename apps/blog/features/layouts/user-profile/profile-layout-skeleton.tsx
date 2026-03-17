import { Skeleton } from '@ui/components/skeletons/skeleton';

const ProfileLayoutSkeleton = () => {
  return (
    <div role="status" aria-label="Loading profile">
      <span className="sr-only">Loading...</span>
      {/* Cover area */}
      <div className="relative w-full bg-slate-800 text-sm leading-6">
        <div className="relative min-h-[280px] sm:min-h-[320px]">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

          <div className="relative flex h-full min-h-[280px] flex-col items-center justify-center px-4 py-6 sm:min-h-[320px]">
            <div className="w-full max-w-2xl rounded-2xl bg-black/30 p-6 backdrop-blur-sm sm:p-8">
              {/* Avatar and Name Row */}
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <Skeleton className="h-20 w-20 shrink-0 rounded-full bg-white/10 ring-4 ring-white/30 sm:h-24 sm:w-24" />

                <div className="flex flex-1 flex-col items-center gap-2 sm:items-start">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-40 bg-white/10" />
                    <Skeleton className="h-6 w-10 rounded-full bg-white/10" />
                  </div>
                  <Skeleton className="h-4 w-64 bg-white/10" />
                  <Skeleton className="h-4 w-48 bg-white/10" />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="mt-6 grid grid-cols-4 gap-2 border-t border-white/10 pt-6 sm:gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <Skeleton className="h-6 w-12 bg-white/10" />
                    <Skeleton className="h-4 w-16 bg-white/10" />
                  </div>
                ))}
              </div>

              {/* Metadata Row */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
                <Skeleton className="h-4 w-24 bg-white/10" />
                <Skeleton className="h-4 w-32 bg-white/10" />
                <Skeleton className="h-4 w-28 bg-white/10" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation bar */}
      <div className="flex flex-col pb-8 md:pb-4">
        <div className="w-full">
          <div className="bg-gray-700">
            <div className="container mx-auto max-w-screen-xl px-0 sm:px-8">
              <div className="flex items-center">
                <nav className="flex-1 overflow-x-auto">
                  <ul className="flex gap-1 sm:gap-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <li key={i} className="px-3 py-3">
                        <Skeleton className="h-5 w-16 bg-white/10" />
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>
            </div>
          </div>
        </div>

        {/* Content area placeholder */}
        <main className="container mx-auto max-w-screen-xl pt-4">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProfileLayoutSkeleton;
