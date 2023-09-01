import Big from "big.js";

export function convertStringToBig(number: string): Big {
  if (number === "") throw new Error("Number cant be empty string");
  return new Big(number.split(" ")[0]);
}
