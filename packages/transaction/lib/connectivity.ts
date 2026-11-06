import { ReadTransportError } from './read-transport';
import { isNodeNetworkFailure, isWaxRequestTimeout } from './transaction-inclusion';

/**
 * While the API nodes were found unreachable, how long calls ask their first node only before one
 * call may fail over across all of them again, to tell a network that came back from one still down.
 */
export const UNREACHABLE_RECHECK_MS = 60_000;

/**
 * How long a node that gave no answer counts as silent. When every node a call may ask has been
 * silent within it, and none answered since, the nodes are unreachable, though no single call, held
 * to a few nodes by its time budget while requests hang, asked them all.
 */
export const SILENT_NODE_WINDOW_MS = 60_000;

/** An operation refused because the browser is offline: nothing was signed or sent. */
export class BrowserOfflineError extends Error {
  constructor() {
    super('The browser is offline');
    this.name = 'BrowserOfflineError';
  }
}

type TConnectivityListener = (connected: boolean) => void;

export interface IConnectivityOptions {
  /** Clock, injectable for tests. */
  now?: () => number;
}

/**
 * The browser's connection to the API nodes. It is lost when the browser reports going offline (its
 * `offline` event) or when every node a call may ask gave no answer within SILENT_NODE_WINDOW_MS
 * (`reportSilent`), across calls, and back on the `online` event or once any node answers. The browser's initial `navigator.onLine` is not
 * trusted, as React Query does not trust it: Chromium reports `false` without a default route even
 * when the nodes are reachable.
 */
export class Connectivity {
  private browserOffline = false;
  private unreachableSince: number | undefined;
  private lastFailoverAt = 0;
  private readonly silentAt = new Map<string, number>();
  private readonly listeners = new Set<TConnectivityListener>();
  private readonly now: () => number;

  constructor({ now = Date.now }: IConnectivityOptions = {}) {
    this.now = now;
  }

  /** Whether the browser reported going offline and not yet back online. */
  isBrowserOffline(): boolean {
    return this.browserOffline;
  }

  isConnected(): boolean {
    return !this.browserOffline && this.unreachableSince === undefined;
  }

  /**
   * Whether a call may fail over across the nodes. Not while the browser is offline; while the nodes
   * were found unreachable, only the first call after every UNREACHABLE_RECHECK_MS, which this claims.
   */
  admitsFailover(): boolean {
    if (this.browserOffline) return false;
    if (this.unreachableSince === undefined) return true;
    if (this.now() - this.lastFailoverAt < UNREACHABLE_RECHECK_MS) return false;
    this.lastFailoverAt = this.now();
    return true;
  }

  /** A node answered, if only with an HTTP error, so the network works, whatever the browser last reported. */
  reportAnswered(): void {
    this.silentAt.clear();
    if (this.isConnected()) return;
    this.browserOffline = false;
    this.unreachableSince = undefined;
    this.notify();
  }

  /**
   * `node` gave no answer at all (see `isUnanswered`) to a call that may ask `nodes`. Once each of
   * `nodes`, more than one, has been silent within SILENT_NODE_WINDOW_MS with no answer from any node
   * since, the nodes are unreachable: a node or two only slow among many that answer is not.
   */
  reportSilent(node: string, nodes: readonly string[]): void {
    const now = this.now();
    this.silentAt.set(node, now);
    const isSilent = (other: string): boolean => {
      const at = this.silentAt.get(other);
      return at !== undefined && now - at <= SILENT_NODE_WINDOW_MS;
    };
    if (new Set(nodes).size > 1 && nodes.every(isSilent)) this.reportUnanswered();
  }

  /** No node answered at all: a network failure or a timeout on each. */
  reportUnanswered(): void {
    if (this.unreachableSince !== undefined) return;
    this.unreachableSince = this.now();
    this.lastFailoverAt = this.now();
    this.notify();
  }

  /** Whether a failed request got no answer from its node: it failed on the network, timed out or was aborted. */
  isUnanswered(error: unknown): boolean {
    if (error instanceof ReadTransportError) return error.status === undefined;
    return isNodeNetworkFailure(error) || isWaxRequestTimeout(error);
  }

  /** Follows the browser's `online` and `offline` events; returns the function that stops it. */
  followBrowser(target: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>): () => void {
    const onOnline = () => this.setBrowserOffline(false);
    const onOffline = () => this.setBrowserOffline(true);
    target.addEventListener('online', onOnline);
    target.addEventListener('offline', onOffline);
    return () => {
      target.removeEventListener('online', onOnline);
      target.removeEventListener('offline', onOffline);
    };
  }

  /** Subscribes to the connection being lost or back; returns the unsubscribe function. */
  onChange(listener: TConnectivityListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setBrowserOffline(offline: boolean): void {
    const wasConnected = this.isConnected();
    this.browserOffline = offline;
    // Back online, the nodes get a fresh chance: what failed before may have been this browser's network.
    if (!offline) {
      this.unreachableSince = undefined;
      this.silentAt.clear();
    }
    if (this.isConnected() !== wasConnected) this.notify();
  }

  private notify(): void {
    const connected = this.isConnected();
    this.listeners.forEach((listener) => listener(connected));
  }
}

let browserConnectivity: Connectivity | undefined;

/** The browser's one `Connectivity`, following its `online`/`offline` events; `undefined` on the server. */
export const getBrowserConnectivity = (): Connectivity | undefined => {
  if (typeof window === 'undefined') return undefined;
  if (!browserConnectivity) {
    browserConnectivity = new Connectivity();
    browserConnectivity.followBrowser(window);
  }
  return browserConnectivity;
};
