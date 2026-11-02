/**
 * The Hive MetaMask snap version installed when `METAMASK_SNAP_VERSION` is unset: the newest one
 * stock MetaMask's snap allowlist admits. `STANDARD_MEMO_LAYOUT_SNAP_VERSION` is not on it yet
 * (it lists 1.6.0 and 1.7.0); once it is, set this to it, or set
 * `REACT_APP_METAMASK_SNAP_VERSION=1.8.0` for a single deployment.
 */
export const DEFAULT_METAMASK_SNAP_VERSION = '1.6.0';

/**
 * The first snap whose bundled wax writes the standard memo layout and reads both (see
 * `memo-layout`). Snaps 1.6.0 and 1.7.0 write and read only the legacy layout.
 */
export const STANDARD_MEMO_LAYOUT_SNAP_VERSION = '1.8.0';

const VERSION_PATTERN = /^\D*(\d+)\.(\d+)\.(\d+)/;

/** The installed snap is older than the version this deployment asks for, and was not updated. */
export class OutdatedMetaMaskSnapError extends Error {
  name = 'OutdatedMetaMaskSnapError';
  readonly installedVersion: string;
  readonly requiredVersion: string;

  constructor(installedVersion: string, requiredVersion: string, options?: ErrorOptions) {
    super(
      `The Hive Wallet snap installed in MetaMask is version ${installedVersion}, older than the ${requiredVersion} required: update it in MetaMask and try again`,
      options
    );
    this.installedVersion = installedVersion;
    this.requiredVersion = requiredVersion;
  }
}

function parseSnapVersion(version: string): [number, number, number] {
  const match = VERSION_PATTERN.exec(version);
  if (!match) throw new Error(`Not a MetaMask snap version: "${version}"`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** Compares the major.minor.patch of two snap versions; a prerelease suffix is ignored. @throws when either is not a version */
export function isSnapVersionOlder(version: string, than: string): boolean {
  const left = parseSnapVersion(version);
  const right = parseSnapVersion(than);
  const differing = left.findIndex((part, i) => part !== right[i]);
  return differing >= 0 && left[differing] < right[differing];
}

export const snapWritesStandardMemoLayout = (snapVersion: string) =>
  !isSnapVersionOlder(snapVersion, STANDARD_MEMO_LAYOUT_SNAP_VERSION);

/** The version a deployment asks for: `METAMASK_SNAP_VERSION`, or the default when unset or empty. */
export const requiredSnapVersion = (configuredVersion: string | undefined) =>
  configuredVersion || DEFAULT_METAMASK_SNAP_VERSION;

export interface SnapInstallation {
  /** The installed snap's version, or undefined when it isn't installed. */
  getInstalledVersion(): Promise<string | undefined>;
  /** `wallet_requestSnaps`: installs the snap, or offers the user an update of an older one. */
  install(version: string): Promise<void>;
}

/**
 * Makes sure the installed snap is at `requiredVersion` or newer, installing it, or asking MetaMask
 * to update an older one, and returns the installed version.
 *
 * @throws {OutdatedMetaMaskSnapError} when an older snap stays installed: the update was declined
 * or isn't installable (a version off MetaMask's allowlist).
 */
export async function ensureSnapVersion(snap: SnapInstallation, requiredVersion: string): Promise<string> {
  const installedBefore = await snap.getInstalledVersion();
  if (installedBefore !== undefined && !isSnapVersionOlder(installedBefore, requiredVersion)) return installedBefore;

  try {
    await snap.install(requiredVersion);
  } catch (error) {
    if (installedBefore === undefined) throw error;
    throw new OutdatedMetaMaskSnapError(installedBefore, requiredVersion, { cause: error });
  }

  const installed = await snap.getInstalledVersion();
  if (installed === undefined) throw new Error('MetaMask reported no Hive Wallet snap after installing it');
  if (isSnapVersionOlder(installed, requiredVersion)) throw new OutdatedMetaMaskSnapError(installed, requiredVersion);
  return installed;
}
