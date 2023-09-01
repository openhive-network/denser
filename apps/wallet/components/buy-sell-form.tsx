import { useEffect, useReducer, useState } from "react";
import { Input } from "@hive/ui/components/input";
import { Button } from "@hive/ui/components/button";
import clsx from "clsx";
import { convertStringToBig } from "@hive/ui/lib/helpers";
enum ActionType {
  ChangeCostValue = "changeCostValue",
  ChangeAmountValue = "changeAmountValue",
  ChangeTotalValue = "changeTotalValue",
}
type ChangeCostValueAction = {
  type: ActionType.ChangeCostValue;
  cost: string;
};
type ChangeAmountValueAction = {
  type: ActionType.ChangeAmountValue;
  amount: string;
};
type ChangeTotalValueAction = {
  type: ActionType.ChangeTotalValue;
  total: string;
};
type Action =
  | ChangeAmountValueAction
  | ChangeTotalValueAction
  | ChangeCostValueAction;

type State = {
  cost: string;
  amount: string;
  total: string;
};
const reducer = (state: State, action: Action) => {
  switch (action.type) {
    case ActionType.ChangeCostValue: {
      return {
        ...state,
        cost: action.cost,
        ...(state.amount &&
          action.cost && {
            total: convertStringToBig(state.amount)
              .times(convertStringToBig(action.cost))
              .toFixed(6),
          }),
      };
    }
    case ActionType.ChangeAmountValue: {
      return {
        ...state,
        amount: action.amount,
        ...(action.amount && {
          total: convertStringToBig(action.amount).times(state.cost).toFixed(3),
        }),
      };
    }
    case ActionType.ChangeTotalValue: {
      return {
        ...state,
        total: action.total,
        ...(action.total && {
          amount: convertStringToBig(action.total).div(state.cost).toFixed(3),
        }),
      };
    }
    default: {
      return state;
    }
  }
};
export default function BuyOrSellForm({
  price,
  defaultPrice,
  transaction,
}: {
  price: string;
  defaultPrice: string;
  transaction: "sell" | "buy";
}) {
  const [state, dispatch] = useReducer(reducer, {
    cost: price,
    amount: "",
    total: "",
  });

  useEffect(() => {
    dispatch({ type: ActionType.ChangeCostValue, cost: price });
  }, [price]);

  const disabled = Boolean(state.amount || state.total);
  const label = transaction === "sell" ? "SELL HIVE" : "BUY HIVE";
  return (
    <div className="flex flex-col gap-8 w-full">
      <div
        className={clsx("sm:text-xl", {
          "text-red-500": transaction === "sell",
          "text-green-600": transaction === "buy",
        })}
      >
        {label}
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex text-sm justify-between w-full">
          <div className="flex items-center w-24">PRICE</div>
          <div className="flex w-full">
            <Input
              className="h-8 focus-visible:ring-0 rounded-none text-end text-end"
              placeholder="0.0"
              value={state.cost}
              type="number"
              onChange={(e) =>
                dispatch({
                  type: ActionType.ChangeCostValue,
                  cost: e.target.value,
                })
              }
            />
            <div className="bg-slate-300 items-center flex justify-center w-28 dark:bg-slate-900">
              HBD/HIVE
            </div>
          </div>
        </div>{" "}
        <div className="flex text-sm justify-between w-full">
          <div className="flex items-center w-24">AMOUNT</div>
          <div className="flex w-full">
            <Input
              className="h-8 focus-visible:ring-0 rounded-none text-end"
              placeholder="0.0"
              value={state.amount}
              type="number"
              onChange={(e) =>
                dispatch({
                  type: ActionType.ChangeAmountValue,
                  amount: e.target.value,
                })
              }
            />
            <div className="bg-slate-300 items-center flex justify-center w-28 dark:bg-slate-900">
              HIVE
            </div>
          </div>
        </div>{" "}
        <div className="flex text-sm justify-between w-full">
          <div className="flex items-center w-24">TOTAL</div>
          <div className="flex w-full">
            <Input
              className="h-8 focus-visible:ring-0 rounded-none text-end"
              placeholder="0.0"
              value={state.total}
              type="number"
              onChange={(e) =>
                dispatch({
                  type: ActionType.ChangeTotalValue,
                  total: e.target.value,
                })
              }
            />
            <div className="bg-slate-300 items-center flex justify-center w-28 dark:bg-slate-900">
              HBD ($)
            </div>
          </div>
        </div>
      </div>{" "}
      <div className="flex justify-between">
        <div className="text-xs">
          <span
            className="text-red-500 cursor-pointer"
            onClick={(e) =>
              dispatch({
                type: ActionType.ChangeCostValue,
                cost: defaultPrice,
              })
            }
          >
            {transaction === "sell" ? "Highest bid" : "Lowest ask"}:{" "}
          </span>
          <span>{defaultPrice}</span>
        </div>

        <Button
          disabled={!disabled}
          variant="outline"
          className={clsx({
            "border-red-500 text-red-500 bg-black hover:text-red-400 hover:bg-red-950":
              transaction === "sell",
            "border-green-500 text-green-500 bg-green-100 hover:text-green-600 hover:bg-green-50":
              transaction === "buy",
          })}
        >
          {label}
        </Button>
      </div>
    </div>
  );
}
