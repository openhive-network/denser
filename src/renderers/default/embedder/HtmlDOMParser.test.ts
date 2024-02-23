/**
 * Based on: https://github.com/openhive-network/condenser/blob/master/src/shared/HtmlReady.test.js
 */
import {expect} from 'chai';
import 'mocha';
import {AssetEmbedderOptions} from './AssetEmbedder';
import {HtmlDOMParser} from './HtmlDOMParser';

describe('HtmlDOMParser', () => {
    const htmlParserOptions: AssetEmbedderOptions = {
        ipfsPrefix: '',
        imageProxyFn: (url: string) => url,
        usertagUrlFn: (account: string) => `/@${account}`,
        hashtagUrlFn: (hashtag: string) => `/trending/${hashtag}`,
        baseUrl: 'https://hive.blog/',
        width: 640,
        height: 480,
        hideImages: false
    };

    it('should allow links where the text portion and href contains hive.blog', () => {
        const dirty =
            '<xml xmlns="http://www.w3.org/1999/xhtml"><a href="https://hive.blog/signup" xmlns="http://www.w3.org/1999/xhtml">https://hive.blog/signup</a></xml>';
        const parser = new HtmlDOMParser(htmlParserOptions);
        const res = parser.parse(dirty).getParsedDocumentAsString();
        expect(res).to.equal(dirty);
    });

    it('should allow in-page links ', () => {
        const dirty = '<xml xmlns="http://www.w3.org/1999/xhtml"><a href="#some-link" xmlns="http://www.w3.org/1999/xhtml">a link location</a></xml>';
        const parser = new HtmlDOMParser(htmlParserOptions);
        const res = parser.parse(dirty).getParsedDocumentAsString();
        expect(res).to.equal(dirty);

        const externalDomainDirty =
            '<xml xmlns="http://www.w3.org/1999/xhtml"><a href="https://anotherwebsite.com/apples#some-link" xmlns="http://www.w3.org/1999/xhtml">Another website\'s apple section</a></xml>';
        const externalDomainResult = parser.parse(externalDomainDirty).getParsedDocumentAsString();
        expect(externalDomainResult).to.equal(externalDomainDirty);
    });

    it('should not allow links where the text portion contains hive.blog but the link does not', () => {
        const dirty =
            '<xml xmlns="http://www.w3.org/1999/xhtml"><a href="https://steamit.com/signup" xmlns="http://www.w3.org/1999/xhtml">https://hive.blog/signup</a></xml>';
        const cleansed =
            '<xml xmlns="http://www.w3.org/1999/xhtml"><div title="Link expanded to plain text; beware of a potential phishing attempt" class="phishy">https://hive.blog/signup / https://steamit.com/signup</div></xml>';
        const res = new HtmlDOMParser(htmlParserOptions).parse(dirty).getParsedDocumentAsString();
        expect(res).to.equal(cleansed);

        const cased =
            '<xml xmlns="http://www.w3.org/1999/xhtml"><a href="https://steamit.com/signup" xmlns="http://www.w3.org/1999/xhtml">https://hive.blog/signup</a></xml>';
        const cleansedcased =
            '<xml xmlns="http://www.w3.org/1999/xhtml"><div title="Link expanded to plain text; beware of a potential phishing attempt" class="phishy">https://hive.blog/signup / https://steamit.com/signup</div></xml>';
        const rescased = new HtmlDOMParser(htmlParserOptions).parse(cased).getParsedDocumentAsString();
        expect(rescased).to.equal(cleansedcased);

        const withuser =
            '<xml xmlns="http://www.w3.org/1999/xhtml"><a href="https://steamit.com/signup" xmlns="http://www.w3.org/1999/xhtml">https://official@hive.blog/signup</a></xml>';
        const cleansedwithuser =
            '<xml xmlns="http://www.w3.org/1999/xhtml"><div title="Link expanded to plain text; beware of a potential phishing attempt" class="phishy">https://official@hive.blog/signup / https://steamit.com/signup</div></xml>';
        const reswithuser = new HtmlDOMParser(htmlParserOptions).parse(withuser).getParsedDocumentAsString();
        expect(reswithuser).to.equal(cleansedwithuser);

        const noendingslash = '<xml xmlns="http://www.w3.org/1999/xhtml"><a href="https://steamit.com" xmlns="http://www.w3.org/1999/xhtml">https://hive.blog</a></xml>';
        const cleansednoendingslash =
            '<xml xmlns="http://www.w3.org/1999/xhtml"><div title="Link expanded to plain text; beware of a potential phishing attempt" class="phishy">https://hive.blog / https://steamit.com</div></xml>';
        const resnoendingslash = new HtmlDOMParser(htmlParserOptions).parse(noendingslash).getParsedDocumentAsString();
        expect(resnoendingslash).to.equal(cleansednoendingslash);

        // make sure extra-domain in-page links are also caught by our phishy link scan.
        const domainInpage =
            '<xml xmlns="http://www.w3.org/1999/xhtml"><a href="https://steamit.com#really-evil-inpage-component" xmlns="http://www.w3.org/1999/xhtml">https://hive.blog</a></xml>';
        const cleanDomainInpage =
            '<xml xmlns="http://www.w3.org/1999/xhtml"><div title="Link expanded to plain text; beware of a potential phishing attempt" class="phishy">https://hive.blog / https://steamit.com#really-evil-inpage-component</div></xml>';
        const resDomainInpage = new HtmlDOMParser(htmlParserOptions).parse(domainInpage).getParsedDocumentAsString();
        expect(resDomainInpage).to.equal(cleanDomainInpage);

        // anchor links including hive.blog should be allowed
        const inpage =
            '<xml xmlns="http://www.w3.org/1999/xhtml"><a href="#https://steamit.com/unlikelyinpagelink" xmlns="http://www.w3.org/1999/xhtml">Go down lower for https://hive.blog info!</a></xml>';
        const cleanInpage =
            '<xml xmlns="http://www.w3.org/1999/xhtml"><a href="#https://steamit.com/unlikelyinpagelink" xmlns="http://www.w3.org/1999/xhtml">Go down lower for https://hive.blog info!</a></xml>';
        const resinpage = new HtmlDOMParser(htmlParserOptions).parse(inpage).getParsedDocumentAsString();
        expect(resinpage).to.equal(cleanInpage);

        const noprotocol =
            '<xml xmlns="http://www.w3.org/1999/xhtml"><a href="https://steamit.com/" xmlns="http://www.w3.org/1999/xhtml">for a good time, visit hive.blog today</a></xml>';
        const cleansednoprotocol =
            '<xml xmlns="http://www.w3.org/1999/xhtml"><div title="Link expanded to plain text; beware of a potential phishing attempt" class="phishy">for a good time, visit hive.blog today / https://steamit.com/</div></xml>';
        const resnoprotocol = new HtmlDOMParser(htmlParserOptions).parse(noprotocol).getParsedDocumentAsString();
        expect(resnoprotocol).to.equal(cleansednoprotocol);
    });

    it('should allow more than one link per post', () => {
        const somanylinks = '<xml xmlns="http://www.w3.org/1999/xhtml">https://foo.com and https://blah.com</xml>';
        const htmlified =
            '<xml xmlns="http://www.w3.org/1999/xhtml"><span><a href="https://foo.com">https://foo.com</a> and <a href="https://blah.com">https://blah.com</a></span></xml>';
        const res = new HtmlDOMParser(htmlParserOptions).parse(somanylinks).getParsedDocumentAsString();
        expect(res).to.equal(htmlified);
    });

    it('should link usernames', () => {
        const textwithmentions = '<xml xmlns="http://www.w3.org/1999/xhtml">@username (@a1b2, whatever</xml>';
        const htmlified = '<xml xmlns="http://www.w3.org/1999/xhtml"><span><a href="/@username">@username</a> (<a href="/@a1b2">@a1b2</a>, whatever</span></xml>';
        const res = new HtmlDOMParser(htmlParserOptions).parse(textwithmentions).getParsedDocumentAsString();
        expect(res).to.equal(htmlified);
    });

    it('should detect only valid mentions', () => {
        const textwithmentions = '@abc @xx (@aaa1) @_x @eee, @fff! https://x.com/@zzz/test';
        const res = new HtmlDOMParser(htmlParserOptions).setMutateEnabled(false).parse(textwithmentions).getState();
        const usertags = Array.from(res.usertags).join(',');
        expect(usertags).to.equal('abc,aaa1,eee,fff');
    });

    it('should not link usernames at the front of linked text', () => {
        const nameinsidelinkfirst = '<xml xmlns="http://www.w3.org/1999/xhtml"><a href="https://hive.blog/signup">@hihi</a></xml>';
        const htmlified = '<xml xmlns="http://www.w3.org/1999/xhtml"><a href="https://hive.blog/signup">@hihi</a></xml>';
        const res = new HtmlDOMParser(htmlParserOptions).parse(nameinsidelinkfirst).getParsedDocumentAsString();
        expect(res).to.equal(htmlified);
    });

    it('should not link usernames in the middle of linked text', () => {
        const nameinsidelinkmiddle = '<xml xmlns="http://www.w3.org/1999/xhtml"><a href="https://hive.blog/signup">hi @hihi</a></xml>';
        const htmlified = '<xml xmlns="http://www.w3.org/1999/xhtml"><a href="https://hive.blog/signup">hi @hihi</a></xml>';
        const res = new HtmlDOMParser(htmlParserOptions).parse(nameinsidelinkmiddle).getParsedDocumentAsString();
        expect(res).to.equal(htmlified);
    });

    it('should make relative links absolute with https by default', () => {
        const noRelativeHttpHttpsOrHive = '<xml xmlns="http://www.w3.org/1999/xhtml"><a href="land.com"> zippy </a> </xml>';
        const cleansedRelativeHttpHttpsOrHive = '<xml xmlns="http://www.w3.org/1999/xhtml"><a href="https://land.com"> zippy </a> </xml>';
        const resNoRelativeHttpHttpsOrHive = new HtmlDOMParser(htmlParserOptions).parse(noRelativeHttpHttpsOrHive).getParsedDocumentAsString();
        expect(resNoRelativeHttpHttpsOrHive).to.equal(cleansedRelativeHttpHttpsOrHive);
    });

    it('should allow the hive uri scheme for vessel links', () => {
        const noRelativeHttpHttpsOrHive = '<xml xmlns="http://www.w3.org/1999/xhtml"><a href="hive://veins.com"> arteries </a> </xml>';
        const cleansedRelativeHttpHttpsOrHive = '<xml xmlns="http://www.w3.org/1999/xhtml"><a href="hive://veins.com"> arteries </a> </xml>';
        const resNoRelativeHttpHttpsOrHive = new HtmlDOMParser(htmlParserOptions).parse(noRelativeHttpHttpsOrHive).getParsedDocumentAsString();
        expect(resNoRelativeHttpHttpsOrHive).to.equal(cleansedRelativeHttpHttpsOrHive);
    });

    it('should not mistake usernames in valid comment urls as mentions', () => {
        const url = 'https://hive.blog/spam/@test-safari/34gfex-december-spam#@test-safari/re-test-safari-34gfex-december-spam-20180110t234627522z';
        const prefix = '<xml xmlns="http://www.w3.org/1999/xhtml">';
        const suffix = '</xml>';
        const input = prefix + url + suffix;
        const expected = prefix + '<span><a href="' + url + '">' + url + '</a></span>' + suffix;
        const result = new HtmlDOMParser(htmlParserOptions).parse(input).getParsedDocumentAsString();
        expect(result).to.equal(expected);
    });

    it('should not modify text when mention contains invalid username', () => {
        const body = 'valid mention match but invalid username..@usernamewaytoolong';
        const prefix = '<xml xmlns="http://www.w3.org/1999/xhtml">';
        const suffix = '</xml>';
        const input = prefix + body + suffix;
        const result = new HtmlDOMParser(htmlParserOptions).parse(input).getParsedDocumentAsString();
        expect(result).to.equal(input);
    });

    it('should detect urls that are phishy', () => {
        const dirty =
            '<xml xmlns="http://www.w3.org/1999/xhtml"><a href="https://steewit.com/signup" xmlns="http://www.w3.org/1999/xhtml">https://hive.blog/signup</a></xml>';
        const cleansed =
            '<xml xmlns="http://www.w3.org/1999/xhtml"><div title="Link expanded to plain text; beware of a potential phishing attempt" class="phishy">https://hive.blog/signup / https://steewit.com/signup</div></xml>';
        const res = new HtmlDOMParser(htmlParserOptions).parse(dirty).getParsedDocumentAsString();
        expect(res).to.equal(cleansed);
    });

    it('should not omit text on same line as youtube link', () => {
        const testString = '<html><p>before text https://www.youtube.com/watch?v=NrS9vvNgx7I after text</p></html>';
        const htmlified = '<html xmlns="http://www.w3.org/1999/xhtml"><p>before text ~~~ embed:NrS9vvNgx7I youtube ~~~ after text</p></html>';
        const res = new HtmlDOMParser(htmlParserOptions).parse(testString).getParsedDocumentAsString();
        expect(res).to.equal(htmlified);
    });

    it('should not omit text on same line as vimeo link', () => {
        const testString = '<html><p>before text https://vimeo.com/193628816/ after text</p></html>';
        const htmlified = '<html xmlns="http://www.w3.org/1999/xhtml"><p>before text ~~~ embed:193628816 vimeo ~~~ after text</p></html>';
        const res = new HtmlDOMParser(htmlParserOptions).parse(testString).getParsedDocumentAsString();
        expect(res).to.equal(htmlified);
    });
});
