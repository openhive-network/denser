import { OnlineClient, type AuthStatus, type KeyAuthorityType } from '@hiveio/hb-auth';

import { getChain } from '../wax';
import { endSafeStorageWriting, markSafeStorageWriting } from './safe-storage-generation';

/** An online client operations run with, renewing the safe storage generation after its writes */
export interface OperationClient extends OnlineClient {
  /** The base path of the app the client is of */
  readonly basePath: string;
  /** Whether its worker is the app's current one */
  readonly isCurrent: boolean;
  beginOperation(): void;
  endOperation(): void;
  /** Records the files its worker wrote as the current generation; false when another write superseded it */
  renewGeneration(): boolean;
}

/** The current client of the app at `basePath`, with the operation not begun */
export type CurrentClient = (basePath: string) => Promise<OperationClient>;

/** How many times a write superseded by another app's write is repeated before it fails */
const MAX_WRITE_REPEATS = 3;

/**
 * A write to safe storage that another app's writes kept superseding, or that could not be repeated
 * in the worker the app moved to: the key it wrote is to be added to safe storage again.
 */
export class SupersededKeyWriteError extends Error {
  readonly username: string;
  readonly keyType: KeyAuthorityType;

  constructor(username: string, keyType: KeyAuthorityType, options?: ErrorOptions) {
    super(
      `Saving your ${keyType} key to safe storage was interrupted by another tab. Add the ${keyType} key to safe storage again.`,
      options
    );
    this.name = 'SupersededKeyWriteError';
    this.username = username;
    this.keyType = keyType;
  }
}

/** Options of an operation run with the online client */
export interface OnlineClientOperationOptions {
  /**
   * Asks the user for the safe storage password of `username`, for repeating a key's write in a
   * worker that starts locked, when the operation did not unlock with the password itself
   */
  requestPassword?: (username: string) => Promise<string>;
}

/**
 * The client an operation runs with: the online client it started with, until a write finds that
 * client's worker superseded, or another app's write supersedes it during a write. The write, and
 * every call after it, then go to the app's current client, so a key the operation registers is in
 * the worker it signs with. Every write renews the safe storage generation, so a worker another app
 * started between two writes of the operation is replaced before it writes back files without the
 * later one. Writes go through the proxy's register, importKey and invalidateExistingKey; not the
 * passkey methods: hb-auth keeps passkeys in an IndexedDB database of their own, written and read by
 * the page rather than the worker.
 */
class OnlineClientOperation {
  #client: OperationClient;
  readonly #currentClient: CurrentClient;
  readonly #requestPassword: OnlineClientOperationOptions['requestPassword'];
  // The safe storage passwords the operation unlocked with, by username
  readonly #passwords = new Map<string, string>();
  // The app whose writes the operation marked (markSafeStorageWriting)
  #writingApp: string | undefined;
  readonly client: OnlineClient;

  /** Runs with `client`, which has the operation begun, following the clients `currentClient` gives */
  constructor(
    client: OperationClient,
    currentClient: CurrentClient,
    { requestPassword }: OnlineClientOperationOptions
  ) {
    this.#client = client;
    this.#currentClient = currentClient;
    this.#requestPassword = requestPassword;
    const writes: Partial<OnlineClient> = {
      register: (username, password, wifKey, keyType, strict) =>
        this.register(username, password, wifKey, keyType, strict),
      importKey: (username, wifKey, keyType) =>
        this.write(username, keyType, (writer, recovering) => this.importKeyIn(writer, recovering, username, wifKey, keyType)),
      invalidateExistingKey: (username, keyType) =>
        this.write(username, keyType, (writer) => OnlineClient.prototype.invalidateExistingKey.call(writer, username, keyType)),
      authenticate: async (username, password, keyType) => {
        const status = await this.#client.authenticate(username, password, keyType);
        this.#passwords.set(username, password);
        return status;
      },
      unlock: async (username, password) => {
        await this.#client.unlock(username, password);
        this.#passwords.set(username, password);
      }
    };
    this.client = new Proxy<OnlineClient>(client, {
      get: (_target, property) => {
        if (Object.prototype.hasOwnProperty.call(writes, property)) return Reflect.get(writes, property);
        const value: unknown = Reflect.get(this.#client, property, this.#client);
        return typeof value === 'function' ? value.bind(this.#client) : value;
      }
    });
  }

  end(): void {
    this.#client.endOperation();
    if (this.#writingApp !== undefined) endSafeStorageWriting(this.#writingApp);
  }

  private async register(
    username: string,
    password: string,
    wifKey: string,
    keyType: KeyAuthorityType,
    strict?: boolean
  ): Promise<AuthStatus> {
    const status = await this.write(username, keyType, async (writer, recovering) => {
      if (recovering === 'repeat') await this.removeStaleAlias(writer, username, keyType);
      return OnlineClient.prototype.register.call(writer, username, password, wifKey, keyType, strict);
    });
    this.#passwords.set(username, password);
    return status;
  }

  /**
   * Writes `username`'s `keyType` key with `writeIn`, through the app's current client, and repeats it
   * there while another app's write supersedes it, MAX_WRITE_REPEATS times at most. `writeIn` is told
   * whether the write repeats one, or runs in a client the operation moved to, which starts locked.
   *
   * @throws {SupersededKeyWriteError} when the write kept being superseded, or its repeat failed
   */
  private async write<T>(
    username: string,
    keyType: KeyAuthorityType,
    writeIn: (writer: OperationClient, recovering: 'repeat' | 'moved' | undefined) => Promise<T>
  ): Promise<T> {
    for (let repeats = 0; repeats <= MAX_WRITE_REPEATS; repeats++) {
      const moved = await this.followCurrentClient();
      const writer = this.#client;
      this.#writingApp = writer.basePath;
      markSafeStorageWriting(writer.basePath);
      const result = repeats
        ? await this.repeat(username, keyType, () => writeIn(writer, 'repeat'))
        : await writeIn(writer, moved ? 'moved' : undefined);
      if (writer.renewGeneration()) return result;
    }
    throw new SupersededKeyWriteError(username, keyType);
  }

  private async repeat<T>(username: string, keyType: KeyAuthorityType, write: () => Promise<T>): Promise<T> {
    try {
      return await write();
    } catch (error: unknown) {
      if (error instanceof SupersededKeyWriteError) throw error;
      throw new SupersededKeyWriteError(username, keyType, { cause: error });
    }
  }

  /**
   * Imports the key; in a worker the operation moved to that does not have `username` unlocked, by
   * registering it with the operation's password, which unlocks the wallet as it imports the key.
   */
  private async importKeyIn(
    writer: OperationClient,
    recovering: 'repeat' | 'moved' | undefined,
    username: string,
    wifKey: string,
    keyType: KeyAuthorityType
  ): Promise<string> {
    if (!recovering) return OnlineClient.prototype.importKey.call(writer, username, wifKey, keyType);
    const unlocked = (await writer.getRegisteredUserByUsername(username))?.unlocked ?? false;
    const password = unlocked ? '' : await this.passwordOf(username, keyType);
    if (recovering === 'repeat') await this.removeStaleAlias(writer, username, keyType);
    if (unlocked) return OnlineClient.prototype.importKey.call(writer, username, wifKey, keyType);
    const strict = (await writer.getUserSettings(username))?.strict[keyType] ?? true;
    await OnlineClient.prototype.register.call(writer, username, password, wifKey, keyType, strict);
    return (await getChain()).calculatePublicKey(wifKey);
  }

  /** The password the operation unlocked `username` with; otherwise asks for it, once */
  private async passwordOf(username: string, keyType: KeyAuthorityType): Promise<string> {
    const password = this.#passwords.get(username) ?? (await this.#requestPassword?.(username));
    if (!password) throw new SupersededKeyWriteError(username, keyType);
    this.#passwords.set(username, password);
    return password;
  }

  /** Removes the key alias the superseded write left, which hb-auth refuses to write over */
  private removeStaleAlias(writer: OperationClient, username: string, keyType: KeyAuthorityType): Promise<void> {
    return OnlineClient.prototype.invalidateExistingKey.call(writer, username, keyType);
  }

  /** Moves the operation to the app's current client when its own was replaced; true when it moved */
  private async followCurrentClient(): Promise<boolean> {
    const left = this.#client;
    if (left.isCurrent) return false;
    // Let go of first: the replacement may wait for the worker this client holds to be retired
    left.endOperation();
    try {
      this.#client = await this.#currentClient(left.basePath).then((current) => {
        current.beginOperation();
        return current;
      });
    } catch (error: unknown) {
      left.beginOperation();
      throw error;
    }
    return this.#client !== left;
  }
}

/**
 * Runs `operation` with `client`, which has the operation begun, and with the app's current client
 * `currentClient` gives once a write finds `client` replaced
 */
export const runOperation = async <T>(
  client: OperationClient,
  currentClient: CurrentClient,
  operation: (client: OnlineClient) => Promise<T>,
  options: OnlineClientOperationOptions = {}
): Promise<T> => {
  const running = new OnlineClientOperation(client, currentClient, options);
  try {
    return await operation(running.client);
  } finally {
    running.end();
  }
};
