/**
 * Conventional Hive json_metadata.app value for content published via denser.
 * Format: app_name/version (see Hive community convention).
 *
 * Must be passed explicitly into wax BlogPostOperation / ReplyOperation —
 * otherwise wax defaults app to `@hiveio/wax/<version>` (hive/denser#832).
 */
export const PUBLISHING_APP = 'denser/0.1';
