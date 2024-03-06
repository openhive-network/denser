import {expect} from 'chai';
import {Localization} from '../Localization';
import {TagTransformingSanitizer} from './TagTransformingSanitizer';

const options = {
    iframeWidth: 100,
    iframeHeight: 100,
    addNofollowToLinks: false,
    addTargetBlankToLinks: false,
    cssClassForInternalLinks: 'internal',
    cssClassForExternalLinks: 'external',
    noImage: false,
    isLinkSafeFn: (url: string) => url != 'https://unsafe.com',
    addExternalCssClassToMatchingLinksFn: (url: string) => url != 'https://engrave.dev'
};

describe('TagTransformingSanitizer', () => {
    describe('a', () => {
        [
            {
                description: 'should add internal class to internal links',
                input: '<a href="https://engrave.dev">Example</a>',
                expected: '<a href="https://engrave.dev" class="internal">Example</a>'
            },
            {
                description: 'should add external class to external links',
                input: '<a href="https://example.com">Example</a>',
                expected: '<a href="https://example.com" class="external">Example</a>'
            },
            {
                description: 'should remove unwanted attributes',
                input: '<a href="https://engrave.dev" media="all">engrave.dev</a>',
                expected: '<a href="https://engrave.dev" class="internal">engrave.dev</a>'
            },
            {
                description: 'should allow anchor links with no href',
                input: '<a id="anchor">Example</a>',
                expected: '<a id="anchor" class="internal">Example</a>'
            },
            {
                description: 'should trim href',
                input: '<a href=" https://engrave.dev ">Example</a>',
                expected: '<a href="https://engrave.dev" class="internal">Example</a>'
            },
            {
                description: 'should mark unsafe links as potentially phishing',
                input: '<a href="https://unsafe.com">Example</a>',
                expected:
                    '<a href="https://unsafe.com" rel="noopener" title="Link expanded to plain text; beware of a potential phishing attempt" target="_self" class="external">Example</a>'
            },
            {
                description: 'should not allow invalid schemes',
                input: '<a href="ptth://engrave.dev">Example</a>',
                expected: '<a class="external">Example</a>'
            }
        ].forEach(({description, expected, input}) => {
            it(description, () => {
                const sanitizer = new TagTransformingSanitizer(options, Localization.DEFAULT);
                const sanitized = sanitizer.sanitize(input);
                expect(sanitized).to.be.equal(expected);
            });
        });
    });
});
