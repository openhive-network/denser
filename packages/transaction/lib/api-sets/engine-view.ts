import type { IApiSetsConfig, TApiSetId } from '@ui/config/api-sets';
import type { IApiSetEngine, IApiSetView } from './router';

/**
 * An engine's routes: its `fallbackOrder`, the node /healthchecker shows as active first, then the
 * set's other eligible nodes, the operator's preferred ones before the rest of the catalog.
 */
export function createEngineView(engine: IApiSetEngine, config: IApiSetsConfig): IApiSetView {
  const selectedNode = (setId: TApiSetId): string | undefined => {
    const selection = engine.selection(setId);
    return selection === 'auto' ? undefined : selection;
  };
  return {
    nodesFor: (setId) => (config.sets.includes(setId) ? engine.fallbackOrder(setId) : []),
    selectedNode,
    report: (setId, node, outcome) => {
      engine.report(setId, node, outcome);
    }
  };
}
