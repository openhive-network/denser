import { preferredNodes, type IApiSetsConfig, type TApiSetId } from '@ui/config/api-sets';
import { OPTIONAL_API_SETS, type IApiSetEngine, type IApiSetView } from './router';

/**
 * An engine's routes: its `fallbackOrder`, the node /healthchecker shows as active first, then the
 * set's other eligible nodes, the operator's preferred ones before the rest of the catalog. While no
 * node is eligible (every probe failed, e.g. at boot), the operator's nodes the engine does not know
 * to lack the set: the calls go to those anyway, behind the view's, so the routes say so. An
 * optional set (`OPTIONAL_API_SETS`), whose calls go to the routes' nodes alone, lists those behind
 * its order as well, so its nodes the engine has not learned about yet are still asked.
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
      if (order.length > 0 && !OPTIONAL_API_SETS.has(setId)) return order;
      const unsupported = new Set(
        engine
          .rankings(setId)
          .filter(({ state }) => state === 'unsupported')
          .map(({ node }) => node)
      );
      const usable = preferredNodes(config, setId).filter((node) => !unsupported.has(node));
      return [...new Set([...order, ...usable])];
    },
    selectedNode,
    report: (setId, node, outcome) => {
      engine.report(setId, node, outcome);
    }
  };
}
