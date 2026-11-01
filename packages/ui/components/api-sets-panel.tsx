'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiSetsComponent } from '@hiveio/healthchecker-component';
import type { ApiSetEngine } from '@hiveio/healthchecker-component/engine';
import { getBrowserApiSetEngine } from '@transaction/lib/api-sets/browser';
import type { TApiSetChecks } from '@transaction/lib/api-sets/definitions';
import { getBrowserApiSetsConfig } from '@ui/config/browser-api-sets';
import { createApiSetsSelectionStorage } from '@ui/lib/api-sets-storage';
import { Button } from '@ui/components/button';

interface IApiSetsPanelProps {
  /** The server engine's node health, so the panel starts from the server's view. */
  snapshot: unknown;
  /** Builds the sets' health checks, run while the nodes are being checked. */
  createChecks?: () => Promise<TApiSetChecks>;
  checkLabel: string;
  stopLabel: string;
  /** Says that only the listed nodes can be chosen: the panel offers no custom nodes. */
  catalogOnlyNote: string;
}

/**
 * The package component's last child is its "Add Custom Node" form, which it always renders: the
 * browser engine refuses custom nodes (see `getBrowserApiSetEngine`), so the form is hidden.
 */
const HIDE_CUSTOM_NODE_FORM = '[&>div:last-child]:hidden';

/**
 * One tab per API set with its ranked nodes, where the user picks a node per set (or for every set
 * it serves) or keeps the automatic choice. Nodes are probed only while the user has the check on.
 */
export function ApiSetsPanel({
  snapshot,
  createChecks,
  checkLabel,
  stopLabel,
  catalogOnlyNote
}: IApiSetsPanelProps) {
  const [engine, setEngine] = useState<ApiSetEngine>();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const create = async () => {
      const checks = await createChecks?.();
      if (cancelled) return;
      const config = getBrowserApiSetsConfig();
      const storage = createApiSetsSelectionStorage(config.nodes);
      setEngine(getBrowserApiSetEngine({ config, storage, snapshot, checks }));
    };
    void create();
    return () => {
      cancelled = true;
    };
  }, [snapshot, createChecks]);

  useEffect(() => () => engine?.stop(), [engine]);

  const toggleChecking = useCallback(() => {
    if (!engine) return;
    if (checking) engine.stop();
    else void engine.start();
    setChecking(!checking);
  }, [engine, checking]);

  if (!engine) return null;
  return (
    <div className="flex flex-col gap-2">
      <Button className="self-center" onClick={toggleChecking} data-testid="api-sets-check-toggle">
        {checking ? stopLabel : checkLabel}
      </Button>
      <ApiSetsComponent className={`m-4 ${HIDE_CUSTOM_NODE_FORM}`} engine={engine} />
      <p className="text-muted-foreground m-4 text-sm" data-testid="api-sets-catalog-only">
        {catalogOnlyNote}
      </p>
    </div>
  );
}
