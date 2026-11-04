/**
 * How much code may be highlighted within one render: at most a number of blocks and a total
 * size of their sources in UTF-8 bytes. Shared by every body of that render (see
 * SyntaxHighlightPlugin.withBudget); a block that no longer fits stays plain.
 */
export class HighlightBudget {
    private blocksLeft: number;
    private utf8BytesLeft: number;
    private refused = 0;

    public constructor(maxBlocks: number, maxUtf8Bytes: number) {
        this.blocksLeft = maxBlocks;
        this.utf8BytesLeft = maxUtf8Bytes;
    }

    /** Takes one block of `utf8Bytes` from the budget; false, taking nothing, when it does not fit. */
    public take(utf8Bytes: number): boolean {
        if (this.blocksLeft < 1 || utf8Bytes > this.utf8BytesLeft) {
            this.refused++;
            return false;
        }
        this.blocksLeft--;
        this.utf8BytesLeft -= utf8Bytes;
        return true;
    }

    /** How many blocks the budget has refused so far. */
    public get refusedBlocks(): number {
        return this.refused;
    }
}
