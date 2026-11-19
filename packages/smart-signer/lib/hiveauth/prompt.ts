import type { HiveAuthFailure } from '@smart-signer/lib/hiveauth/hiveauth-error';

/**
 * What the HiveAuth dialog shows: the relay being reached, the link and QR code a wallet app takes a
 * new session from, a request waiting for approval in the wallet app, how a request failed, or
 * nothing once the dialog is closed.
 */
export type HiveAuthPromptState =
  | { phase: 'connecting' }
  | { phase: 'scan'; uri: string }
  | { phase: 'approve' }
  | { phase: 'failed'; failure: HiveAuthFailure }
  | { phase: 'closed' };

/** Whether the dialog asks for a sign-in or for approval of an operation */
export type HiveAuthPromptPurpose = 'sign_in' | 'sign';

/**
 * The state of one HiveAuth dialog, which the signer drives while its requests run and the dialog
 * shows. The dialog's Cancel aborts `signal`, which the requests are sent with.
 */
export class HiveAuthPrompt {
  private state: HiveAuthPromptState = { phase: 'connecting' };
  private readonly listeners = new Set<() => void>();
  private readonly cancelController = new AbortController();

  constructor(readonly purpose: HiveAuthPromptPurpose) {}

  get signal(): AbortSignal {
    return this.cancelController.signal;
  }

  getState = (): HiveAuthPromptState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  showAuthUri(uri: string): void {
    this.set({ phase: 'scan', uri });
  }

  showApprove(): void {
    this.set({ phase: 'approve' });
  }

  /** Shows `failure` until the user closes the dialog; a cancel closes it at once */
  fail(failure: HiveAuthFailure): void {
    this.set(failure === 'cancelled' ? { phase: 'closed' } : { phase: 'failed', failure });
  }

  close(): void {
    this.set({ phase: 'closed' });
  }

  /** The user's cancel: the pending request is dropped and the dialog closes */
  cancel(): void {
    this.cancelController.abort();
    this.close();
  }

  private set(state: HiveAuthPromptState): void {
    if (this.state.phase === 'closed') return;
    this.state = state;
    for (const listener of this.listeners) listener();
  }
}
