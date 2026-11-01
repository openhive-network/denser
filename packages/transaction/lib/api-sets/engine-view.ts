import { preferredNodes, type IApiSetsConfig, type TApiSetId } from '@ui/config/api-sets';
import type { IApiSetEngine, IApiSetView } from './router';

/**
 * An engine's routes: its `fallbackOrder`, the node /healthchecker shows as active first, then the
 * set's other eligible nodes, the operator's preferred ones before the rest of the catalog. While no
 * node is eligible (every probe failed, e.g. at boot), the operator's nodes the engine does not know
 * to lack the set: the calls go to those anyway, behind the view's, so the routes say so.
 */
export function createEngineView(engine: IApiSetEngine, config: IApiSetsConfig): IApiSetView {
  const selectedNode = (setId: TApiSetId): string | undefined => {
    const selection = engine.selection(setId);
    return selection === 'auto' ? undefined : selection;
  };
  return {
    nodesFor: (setId) => {
      if (!config.sets.includes(setId)) return [];
      const order = engine.fallbackOrder(setId);
      if (order.length > 0) return order;
      const unsupported = new Set(
        engine
          .rankings(setId)
          .filter(({ state }) => state === 'unsupported')
          .map(({ node }) => node)
      );
      return preferredNodes(config, setId).filter((node) => !unsupported.has(node));
    },
    selectedNode,
    report: (setId, node, outcome) => {
      engine.report(setId, node, outcome);
    }
  };
}
