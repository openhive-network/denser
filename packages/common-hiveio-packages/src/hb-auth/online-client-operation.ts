import { OnlineClient, type AuthStatus, type AuthUser, type KeyAuthorityType } from '@hiveio/hb-auth';

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
 * in the worker the app moved to: the key it wrote is to be added to safe storage again. Its message
 * is for logs; the user is told in their language from `username` and `keyType`.
 */
export class SupersededKeyWriteError extends Error {
  readonly username: string;
  readonly keyType: KeyAuthorityType;

  constructor(username: string, keyType: KeyAuthorityType, options?: ErrorOptions) {
    super(`Saving the ${keyType} key of ${username} to safe storage was superseded by another app's write`, options);
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
        this.write(username, keyType, (writer, recovering) =>
          recovering
            ? this.recoverWrite(writer, recovering, username, wifKey, keyType, {})
            : OnlineClient.prototype.importKey.call(writer, username, wifKey, keyType)
        ),
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
    this.#passwords.clear();
    if (this.#writingApp !== undefined) endSafeStorageWriting(this.#writingApp);
  }

  private async register(
    username: string,
    password: string,
    wifKey: string,
    keyType: KeyAuthorityType,
    strict?: boolean
  ): Promise<AuthStatus> {
    const status = await this.write(username, keyType, async (writer, recovering): Promise<AuthStatus> => {
      if (recovering !== 'repeat')
        return OnlineClient.prototype.register.call(writer, username, password, wifKey, keyType, strict);
      // The superseded write passed hb-auth's check of the key on chain already
      await this.recoverWrite(writer, recovering, username, wifKey, keyType, { password, strict: strict ?? true });
      return { ok: true };
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
   * Writes the key in a worker the operation moved to, which starts locked, or repeats a superseded
   * write there. The worker is unlocked first, which checks the password, and the alias the
   * superseded write left is removed only then, right before importKey writes the key without
   * checking it on chain: a failed unlock leaves the alias, and the key it names, in place. `given`
   * holds the password and Direct Authority Mode setting of a register.
   */
  private async recoverWrite(
    writer: OperationClient,
    recovering: 'repeat' | 'moved',
    username: string,
    wifKey: string,
    keyType: KeyAuthorityType,
    given: { password?: string; strict?: boolean }
  ): Promise<string> {
    const user = await writer.getRegisteredUserByUsername(username);
    if (!user) return this.registerFirstKey(writer, recovering, username, wifKey, keyType, given);
    if (!user.unlocked) await this.unlockIn(writer, user, keyType, given.password);
    if (recovering === 'repeat') await this.removeStaleAlias(writer, username, keyType);
    const publicKey = await OnlineClient.prototype.importKey.call(writer, username, wifKey, keyType);
    if (given.strict !== undefined) await writer.setUserSettings(username, { strict: given.strict }, keyType);
    return publicKey;
  }

  /**
   * Registers the key of a user safe storage has no wallet of in `writer`'s worker, which a register
   * creates: there is no stored key to lose. An import of such a user's key cannot be repeated.
   */
  private async registerFirstKey(
    writer: OperationClient,
    recovering: 'repeat' | 'moved',
    username: string,
    wifKey: string,
    keyType: KeyAuthorityType,
    { password, strict }: { password?: string; strict?: boolean }
  ): Promise<string> {
    if (password === undefined || strict === undefined) throw new SupersededKeyWriteError(username, keyType);
    if (recovering === 'repeat') await this.removeStaleAlias(writer, username, keyType);
    await OnlineClient.prototype.register.call(writer, username, password, wifKey, keyType, strict);
    this.#passwords.set(username, password);
    return (await getChain()).calculatePublicKey(wifKey);
  }

  /**
   * Unlocks `user` in `writer`'s worker with `given`, or the password the operation unlocked with, or
   * else the one it asks for, remembering it once it unlocked. hb-auth unlocks only a user the worker
   * has a session of; in a worker without one the user is authenticated, with each key type safe
   * storage holds, `keyType` last, as the key a superseded write left may not be on chain yet.
   */
  private async unlockIn(
    writer: OperationClient,
    user: AuthUser,
    keyType: KeyAuthorityType,
    given: string | undefined
  ): Promise<void> {
    const { username } = user;
    const password = given ?? this.#passwords.get(username) ?? (await this.#requestPassword?.(username));
    if (!password) throw new SupersededKeyWriteError(username, keyType);
    if (user.authorized) {
      await writer.unlock(username, password);
    } else {
      const keyTypes = [...user.registeredKeyTypes.filter((type) => type !== keyType), keyType];
      await this.authenticateWithAny(writer, username, password, keyTypes);
    }
    this.#passwords.set(username, password);
  }

  /** Authenticates `username` in `writer`'s worker with the first of `keyTypes` that succeeds */
  private async authenticateWithAny(
    writer: OperationClient,
    username: string,
    password: string,
    [keyType, ...others]: KeyAuthorityType[]
  ): Promise<void> {
    try {
      await writer.authenticate(username, password, keyType);
    } catch (error: unknown) {
      if (!others.length) throw error;
      await this.authenticateWithAny(writer, username, password, others);
    }
  }

  /** Removes the key alias the superseded write left, which hb-auth refuses to write over */
  private removeStaleAlias(writer: OperationClient, username: string, keyType: KeyAuthorityType): Promise<void> {
    return OnlineClient.prototype.invalidateExistingKey.call(writer, username, keyType);
  }

  /** Moves the operation to the app's current client when its own was replaced; true when it moved */
  private async followCurrentClient(): Promise<boolean> {
    const left = this.#client;
    if (left.isCurrent) return false;
    // Let go of first, so the replaced worker this client holds is retired once the operation moved
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
