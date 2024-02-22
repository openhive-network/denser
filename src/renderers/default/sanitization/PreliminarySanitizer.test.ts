import { expect } from "chai";

import { PreliminarySanitizer } from "./PreliminarySanitizer";

describe("PreliminarySanitizer", () => {
    it('should remove html comments', () => {
        const input = "Hello <!-- this is a comment --> World";
        const expected = "Hello (html comment removed:  this is a comment ) World";
        const actual = PreliminarySanitizer.preliminarySanitize(input);
        expect(actual).to.be.equal(expected);
    });
});