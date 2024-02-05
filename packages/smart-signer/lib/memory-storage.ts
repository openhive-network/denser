let ms: { [key: string]: string } = {};
let msLength = 0;

function getItem(key: string): string | null {
    return key in ms ? ms[key] : null;
}

function setItem(key: string, value: string): void {
    ms[key] = value;
    msLength++;
}

function removeItem(key: string): void {
    var found = key in ms;
    if (found) {
        msLength--;
        delete ms[key];
    }
}

function clear(): void {
    ms = {};
    msLength = 0
}

function key(index: number): string | null {
    const k = Object.keys(ms)[index]
    return (k) ? k : null;
}

function length() {
    return Object.keys(ms).length;
}

export const memoryStorage = {
    getItem,
    setItem,
    removeItem,
    clear,
    key,
    length: msLength,
};
