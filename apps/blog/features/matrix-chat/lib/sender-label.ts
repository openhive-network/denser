/** A message header's sender: the display name, when it adds anything, and the visible `@localpart` */
export interface SenderLabel {
  /** Null when the display name only repeats the id */
  name: string | null;
  handle: string;
}

/**
 * The display name is free text (a Hive profile name can read "Hive Support"), so the header always
 * shows the id's localpart too; the server part is the same for every member of the blog's rooms.
 */
export function senderLabel(senderId: string, senderName: string): SenderLabel {
  const localpart = senderId.replace(/^@/, '').split(':')[0];
  const handle = `@${localpart}`;
  const repeatsId = senderName === localpart || senderName === handle || senderName === senderId;
  return { name: repeatsId || !senderName ? null : senderName, handle };
}
