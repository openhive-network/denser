import { onApiNodeSwitch } from '@transaction/lib/api-node-switch';
import type { TApiSetTitles } from '@ui/lib/api-set-titles';
import { toast } from '@ui/components/hooks/use-toast';

/** A switch away from the node the user chose for an API set, to describe to them. */
export interface IApiSetSwitch {
  node: string;
  selected: string;
  setTitle: string;
}

/** What the app tells the user of a switch: the sets' titles and the sentence naming one. */
export interface IApiSetSwitchText {
  setTitles: TApiSetTitles;
  describe: (switched: IApiSetSwitch) => string;
}

/**
 * Toasts each switch away from a node the user chose for an API set, in the text `currentText`
 * gives at the time of the switch. Returns the unsubscribe function.
 */
export const toastApiSetSwitches = (currentText: () => IApiSetSwitchText): (() => void) =>
  onApiNodeSwitch((node, detail) => {
    if (!detail) return;
    const { setTitles, describe } = currentText();
    toast({ description: describe({ node, selected: detail.selected, setTitle: setTitles[detail.setId] }) });
  });
