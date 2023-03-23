import { Button } from "@/components/ui/button"

export default function CommunitiesListItem({ community }) {
  return (
    <div className="mb-2 flex justify-between border-2 border-slate-100 py-6 px-4">
      <div className="w-4/5">
        <h2 className="text-lg font-semibold leading-5 text-red-600">
          {community.title}
        </h2>
        <p className="py-4">{community.about}</p>
        <p className="text-sm font-medium leading-5 text-slate-500 dark:text-slate-400">
          {community.subscribers} subscribers <span className="mx-1">•</span>{" "}
          {community.num_authors} authors <span className="mx-1">•</span>
          {community.num_pending} posts
        </p>
        {community.admins?.length > 0 ? (
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            <span className="text-red-600">
              {community.admins?.length > 1 ? "admins" : "admin"}{" "}
            </span>
            {community.admins.map((admin, index) => (
              <>
                {admin}{" "}
                {index !== community.admins.length - 1 ? (
                  <span className="mx-1">•</span>
                ) : null}
              </>
            ))}
          </p>
        ) : null}
      </div>
      <div className="flex w-1/5 items-center justify-center">
        <Button>Subscribe</Button>
      </div>
    </div>
  )
}
