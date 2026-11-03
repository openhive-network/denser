import {
  awaitingReconnect,
  deliver,
  outboxReducer,
  resendInOrder,
  type OutboxAction,
  type OutgoingMessage,
  type SendText
} from './outbox.ts';

/**
 * Delays of the automatic resends after a message fails to reach the homeserver while the chat
 * reports connected; past the last one, the next reconnection resends
 */
export const RESEND_BACKOFF_MS: readonly number[] = [5_000, 15_000, 60_000];

/** Runs `callback` after `ms`; returns what cancels it */
export type ScheduleTimer = (callback: () => void, ms: number) => () => void;

export interface OutgoingQueueOptions {
  backoffMs?: readonly number[];
  schedule?: ScheduleTimer;
  newTxnId?: () => string;
}

const scheduleTimeout: ScheduleTimer = (callback, ms) => {
  const timer = setTimeout(callback, ms);
  return () => clearTimeout(timer);
};

const newTxnId = () => `denser.${Date.now()}.${crypto.randomUUID()}`;

/**
 * The composer's outgoing messages with their sending and failed states. Those that failed for want
 * of a connection are sent again, in order and with their transaction ids, one resend at a time:
 * at once when the chat reconnects, and after each `backoffMs` delay while it reports connected
 * yet they still fail. Those the homeserver rejected wait for `retry`.
 */
export class OutgoingQueue {
  private messages: OutgoingMessage[] = [];
  private readonly listeners = new Set<() => void>();
  private readonly sendText: SendText;
  private readonly backoffMs: readonly number[];
  private readonly schedule: ScheduleTimer;
  private readonly newTxnId: () => string;
  private connected = false;
  private resending = false;
  private backoffStep = 0;
  private cancelScheduledResend: (() => void) | null = null;

  constructor(sendText: SendText, options: OutgoingQueueOptions = {}) {
    this.sendText = sendText;
    this.backoffMs = options.backoffMs ?? RESEND_BACKOFF_MS;
    this.schedule = options.schedule ?? scheduleTimeout;
    this.newTxnId = options.newTxnId ?? newTxnId;
  }

  getMessages = (): readonly OutgoingMessage[] => this.messages;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  send(roomId: string, text: string): void {
    const message = { txnId: this.newTxnId(), roomId, text, createdAt: Date.now() };
    this.dispatch({ type: 'send', ...message });
    void this.deliver(message);
  }

  /** Sends a failed message again; does nothing for one that is not failed */
  retry(txnId: string): void {
    const message = this.messages.find((candidate) => candidate.txnId === txnId);
    if (message?.status !== 'failed') return;
    this.dispatch({ type: 'retry', txnId });
    void this.deliver(message);
  }

  setConnected(connected: boolean): void {
    if (connected === this.connected) return;
    this.connected = connected;
    this.cancelScheduledResend?.();
    this.cancelScheduledResend = null;
    if (!connected) return;
    this.backoffStep = 0;
    void this.resend();
  }

  private dispatch = (action: OutboxAction): void => {
    this.messages = outboxReducer(this.messages, action);
    for (const listener of this.listeners) listener();
  };

  private async deliver(message: Pick<OutgoingMessage, 'txnId' | 'roomId' | 'text'>): Promise<void> {
    const failure = await deliver(this.sendText, message, this.dispatch);
    if (failure === 'rejected') return;
    if (failure === null) this.backoffStep = 0;
    if (awaitingReconnect(this.messages).length > 0) this.scheduleResend();
  }

  private async resend(): Promise<void> {
    // The running resend schedules the next one for whatever it leaves failed, including what
    // failed while it ran
    if (this.resending) return;
    const queued = awaitingReconnect(this.messages);
    if (queued.length === 0) return;
    this.resending = true;
    try {
      await resendInOrder(this.sendText, queued, this.dispatch);
    } finally {
      this.resending = false;
    }
    if (awaitingReconnect(this.messages).length === 0) this.backoffStep = 0;
    else this.scheduleResend();
  }

  private scheduleResend(): void {
    if (!this.connected || this.resending || this.cancelScheduledResend) return;
    const delay = this.backoffMs[this.backoffStep];
    if (delay === undefined) return;
    this.backoffStep += 1;
    this.cancelScheduledResend = this.schedule(() => {
      this.cancelScheduledResend = null;
      void this.resend();
    }, delay);
  }
}
