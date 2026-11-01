import { preferredNodes, type IApiSetsConfig, type TApiSetId } from '@ui/config/api-sets';
import type { IApiSetEngine, IApiSetView } from './router';

/**
 * An engine's routes. Calls fail over only to nodes the operator lists for the set, and to the
 * user's own choice: the catalog holds further nodes users may pick, which the operator did not
 * make failover targets.
 */
export function createEngineView(engine: IApiSetEngine, config: IApiSetsConfig): IApiSetView {
  const selectedNode = (setId: TApiSetId): string | undefined => {
    const selection = engine.selection(setId);
    return selection === 'auto' ? undefined : selection;
  };
  return {
    nodesFor: (setId) => {
      if (!config.sets.includes(setId)) return [];
      const allowed = new Set([...preferredNodes(config, setId), selectedNode(setId)]);
      return engine.fallbackOrder(setId).filter((node) => allowed.has(node));
    },
    selectedNode,
    report: (setId, node, outcome) => {
      engine.report(setId, node, outcome);
    }
  };
}
