import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Big from 'big.js';
import { exceedsAvailableBalance, orderFormReducer, type OrderFormState } from './market-order-form.ts';

const EMPTY: OrderFormState = { price: '0.052502', amount: '', total: '' };

describe('orderFormReducer', () => {
  it('computes the total from the amount at the current price', () => {
    const state = orderFormReducer(EMPTY, { type: 'amount', value: '1000' });
    assert.equal(state.total, '52.502');
  });

  it('clears the total when the amount is cleared', () => {
    const filled = orderFormReducer(EMPTY, { type: 'amount', value: '1000' });
    const cleared = orderFormReducer(filled, { type: 'amount', value: '' });
    assert.deepEqual(cleared, { price: '0.052502', amount: '', total: '' });
  });

  it('recomputes the total, with three decimals, when the price changes', () => {
    const filled = orderFormReducer(EMPTY, { type: 'amount', value: '1000' });
    const repriced = orderFormReducer(filled, { type: 'price', value: '0.052581' });
    assert.equal(repriced.total, '52.581');
  });

  it('keeps the total empty when the price changes with no amount', () => {
    const filled = orderFormReducer(EMPTY, { type: 'amount', value: '1000' });
    const cleared = orderFormReducer(filled, { type: 'amount', value: '' });
    const repriced = orderFormReducer(cleared, { type: 'price', value: '0.052581' });
    assert.equal(repriced.total, '');
  });

  it('clears the total when the price is cleared', () => {
    const filled = orderFormReducer(EMPTY, { type: 'amount', value: '1000' });
    assert.equal(orderFormReducer(filled, { type: 'price', value: '' }).total, '');
  });

  it('computes the amount from a typed total', () => {
    const state = orderFormReducer({ ...EMPTY, price: '0.25' }, { type: 'total', value: '2.5' });
    assert.equal(state.amount, '10.000');
  });

  it('leaves the amount empty for a total at a zero price', () => {
    const state = orderFormReducer({ ...EMPTY, price: '0' }, { type: 'total', value: '2.5' });
    assert.equal(state.amount, '');
  });
});

describe('exceedsAvailableBalance', () => {
  const order: OrderFormState = { price: '0.052502', amount: '1000', total: '52.502' };

  it('compares a buy order by its HBD total', () => {
    assert.equal(exceedsAvailableBalance(order, 'buy', new Big('0.041')), true);
    assert.equal(exceedsAvailableBalance(order, 'buy', new Big('52.502')), false);
  });

  it('compares a sell order by its HIVE amount', () => {
    assert.equal(exceedsAvailableBalance(order, 'sell', new Big('999.999')), true);
    assert.equal(exceedsAvailableBalance(order, 'sell', new Big('1000')), false);
  });

  it('does not report an unknown balance or an empty order', () => {
    assert.equal(exceedsAvailableBalance(order, 'buy', undefined), false);
    assert.equal(exceedsAvailableBalance(EMPTY, 'buy', new Big('0')), false);
  });
});
