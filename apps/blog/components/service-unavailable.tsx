import { FC } from 'react';
import { Icons } from '@ui/components/icons';
import { AlertTriangle, Activity, Home, RefreshCw } from 'lucide-react';

const ServiceUnavailable: FC = () => {
  return (
    <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-20 text-center">
      <div className="mb-6 flex items-end gap-2 relative">
        <Icons.hive className="h-20 w-20 text-muted-foreground/40" />
        <AlertTriangle className="h-8 w-8 text-destructive absolute bottom-[-15px] right-[-15px]" />
      </div>

      <h1 className="mb-2 text-6xl font-bold text-muted-foreground">503</h1>

      <h2 className="mb-4 text-2xl font-semibold">Service Temporarily Unavailable</h2>

      <p className="mb-8 max-w-md text-muted-foreground">
        We&apos;re having trouble connecting to the Hive network. This is usually temporary.
      </p>

      <div className="mb-8 max-w-sm text-left">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          What you can do
        </h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Try refreshing the page in a few moments</span>
          </li>
          <li className="flex items-start gap-2">
            <Activity className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Check the API status on the health checker</span>
          </li>
          <li className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Check back shortly — we&apos;re working on it</span>
          </li>
        </ul>
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        <a
          href="/"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90"
        >
          <Home className="h-4 w-4" />
          Go Home
        </a>
        <a
          href="/healthchecker"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Activity className="h-4 w-4" />
          Check Node Status
        </a>
      </div>
    </div>
  );
};

export default ServiceUnavailable;
