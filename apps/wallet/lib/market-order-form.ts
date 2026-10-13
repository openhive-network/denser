import Big from 'big.js';

/** HIVE and HBD amounts on chain carry three decimals. */
const ASSET_DECIMALS = 3;
const NUMBER_PATTERN = /^(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i;

export type OrderSide = 'buy' | 'sell';

export type OrderFormState = {
  price: string;
  amount: string;
  total: string;
};

export type OrderFormAction =
  | { type: 'price'; value: string }
  | { type: 'amount'; value: string }
  | { type: 'total'; value: string };

const toBig = (value: string): Big | null => (NUMBER_PATTERN.test(value) ? new Big(value) : null);

const totalOf = (amount: string, price: string): string => {
  const amountValue = toBig(amount);
  const priceValue = toBig(price);
  return amountValue && priceValue ? amountValue.times(priceValue).toFixed(ASSET_DECIMALS) : '';
};

const amountOf = (total: string, price: string): string => {
  const totalValue = toBig(total);
  const priceValue = toBig(price);
  return totalValue && priceValue && !priceValue.eq(0) ? totalValue.div(priceValue).toFixed(ASSET_DECIMALS) : '';
};

/**
 * Keeps Total equal to Price × Amount: a price or amount edit recomputes the total (empty when
 * either is empty), a total edit recomputes the amount.
 */
export const orderFormReducer = (state: OrderFormState, action: OrderFormAction): OrderFormState => {
  switch (action.type) {
    case 'price':
      return { ...state, price: action.value, total: totalOf(state.amount, action.value) };
    case 'amount':
      return { ...state, amount: action.value, total: totalOf(action.value, state.price) };
    case 'total':
      return { ...state, total: action.value, amount: amountOf(action.value, state.price) };
    default:
      return state;
  }
};

/**
 * Whether the order spends more than `available`: the HBD total for a buy, the HIVE amount for
 * a sell. An unknown balance or an empty field is not reported as insufficient.
 */
export const exceedsAvailableBalance = (state: OrderFormState, side: OrderSide, available: Big | undefined) => {
  const spent = toBig(side === 'buy' ? state.total : state.amount);
  return Boolean(available && spent && spent.gt(available));
};
