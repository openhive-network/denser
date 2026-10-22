/**
 * The type names of a transaction's operations (`vote_operation`, `comment_operation`, ...), read
 * from wax's protobuf form where each operation is an object with one key set: its type. For logs
 * that name what a transaction did without carrying its body.
 */
export function getOperationNames(operations: readonly object[]): string[] {
  return operations.flatMap((operation) =>
    Object.entries(operation)
      .filter(([, body]) => body !== undefined && body !== null)
      .map(([name]) => name)
  );
}
