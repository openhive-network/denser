export function customEndsWith(text: string, arr: string[]): boolean {
  let value = false;

  for (let i = 0; i < arr.length; i++) {
    value = text.endsWith(arr[i]);
    if (value) {
      break;
    }
  }

  return value;
}
