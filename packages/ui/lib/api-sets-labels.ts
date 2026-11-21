import type { TFunction } from 'i18next';
import type { ApiSetsLabels } from '@hiveio/healthchecker-component';

/**
 * The `{{name}}` placeholders are the component's: it fills them in itself, so the templates are
 * read without interpolation, whatever the instance does with a placeholder it has no value for.
 */
const TEMPLATE = { skipInterpolation: true };

/**
 * The text of the API sets panel (`ApiSetsComponent`) with the app's `t`: the `api_sets.panel`
 * keys of both apps. The custom-node form's text is left out: the panel hides that form.
 */
export const translateApiSetsLabels = (t: TFunction): Partial<ApiSetsLabels> => ({
  heading: t('api_sets.panel.heading'),
  automaticChoice: t('api_sets.panel.automatic_choice'),
  yourChoiceOf: t('api_sets.panel.your_choice_of', TEMPLATE),
  useAutomaticChoice: t('api_sets.panel.use_automatic_choice'),
  fallbackNotice: t('api_sets.node_unavailable', TEMPLATE),
  noNode: t('api_sets.panel.no_node'),
  groupSplit: t('api_sets.panel.group_split', TEMPLATE),
  groupSplitSet: t('api_sets.panel.group_split_set', TEMPLATE),
  listSeparator: t('api_sets.panel.list_separator'),
  stateEligible: t('api_sets.panel.state_eligible'),
  stateUnsupported: t('api_sets.panel.state_unsupported'),
  stateDown: t('api_sets.panel.state_down'),
  stateUnknown: t('api_sets.panel.state_unknown'),
  stateDegraded: t('api_sets.panel.state_degraded'),
  defaultBadge: t('api_sets.panel.default_badge'),
  yourChoiceBadge: t('api_sets.panel.your_choice_badge'),
  inUse: t('api_sets.panel.in_use'),
  median: t('api_sets.panel.median', TEMPLATE),
  p95: t('api_sets.panel.p95', TEMPLATE),
  errors: t('api_sets.panel.errors', TEMPLATE),
  lag: t('api_sets.panel.lag', TEMPLATE),
  milliseconds: t('api_sets.panel.milliseconds', TEMPLATE),
  use: t('api_sets.panel.use'),
  useEverywhere: t('api_sets.panel.use_everywhere'),
  removeNode: t('api_sets.panel.remove_node', TEMPLATE)
});
