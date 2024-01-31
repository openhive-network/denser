let ms: { [key: string]: any } = {};
let msLength = 0;

function getItem(key: string) {
    return key in ms ? ms[key] : null;
}

function setItem(key: string, value: any) {
    ms[key] = value;
    msLength++;
    return true;
}

function removeItem(key: string) {
    var found = key in ms;
    if (found) {
        msLength--;
        return delete ms[key];
    }
    return false;
}

function clear() {
    ms = {};
    msLength = 0
    return true;
}

function key(n: number) {
    const k = Object.keys(ms)[n]
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
