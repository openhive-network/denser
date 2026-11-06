import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toast } from './use-toast.ts';

describe('toast', () => {
  it('shows an error toast identical to one still open only once', () => {
    const first = toast({ variant: 'destructive', title: 'Error', description: 'Network unreachable' });
    const second = toast({ variant: 'destructive', title: 'Error', description: 'Network unreachable' });
    assert.equal(second.id, first.id);
  });

  it('shows an error toast with a different message', () => {
    const first = toast({ variant: 'destructive', title: 'Error', description: 'Network unreachable' });
    const second = toast({ variant: 'destructive', title: 'Error', description: 'Insufficient funds' });
    assert.notEqual(second.id, first.id);
  });

  it('shows each of two identical success toasts', () => {
    const first = toast({ variant: 'success', title: 'Order cancelled', description: '1.000 HIVE' });
    const second = toast({ variant: 'success', title: 'Order cancelled', description: '1.000 HIVE' });
    assert.notEqual(second.id, first.id);
  });

  it('shows each of two identical default toasts', () => {
    const first = toast({ title: 'Copied' });
    const second = toast({ title: 'Copied' });
    assert.notEqual(second.id, first.id);
  });
});
