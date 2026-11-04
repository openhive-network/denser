import {expect} from 'chai';
import links, {isLocalUrl} from './Links';

describe('Links regexp', () => {
    describe('ipfs', () => {
        it('should match legacy ipfs notation', () => {
            expect(links.ipfsProtocol.test('/ipfs/QmQqzMTavQgT4f4T5v6PWBp7XNKtoPmC9jvn12WPT3gkSE')).to.be.true;
            expect(links.ipfsProtocol.test('/ipfs/QmQqzMTavQgT4f4T5v6PWBp7XNKtoPmC9jvn12WPT3gkSE/')).to.be.true;
            expect(links.ipfsProtocol.test('//ipfs/QmQqzMTavQgT4f4T5v6PWBp7XNKtoPmC9jvn12WPT3gkSE')).to.be.true;
            expect(links.ipfsProtocol.test('//ipfs/QmQqzMTavQgT4f4T5v6PWBp7XNKtoPmC9jvn12WPT3gkSE/')).to.be.true;
            expect(links.ipfsProtocol.test('//ipfs/QmQqzMTavQgT4f4T5v6PWBp7XNKtoPmC9jvn12WPT3gkSE/?params=test')).to.be.true;
            expect(links.ipfsProtocol.test('//ipfs/QmQqzMTavQgT4f4T5v6PWBp7XNKtoPmC9jvn12WPT3gkSE/directory/path')).to.be.true;
        });

        it('should match ipfs:// protocol url', () => {
            expect(links.ipfsProtocol.test('ipfs://QmQqzMTavQgT4f4T5v6PWBp7XNKtoPmC9jvn12WPT3gkSE')).to.be.true;
            expect(links.ipfsProtocol.test('ipfs://QmQqzMTavQgT4f4T5v6PWBp7XNKtoPmC9jvn12WPT3gkSE/')).to.be.true;
            expect(links.ipfsProtocol.test('ipfs://QmQqzMTavQgT4f4T5v6PWBp7XNKtoPmC9jvn12WPT3gkSE/directory/path')).to.be.true;
        });

        it('should not match pseudo ipfs url', () => {
            expect(links.ipfsProtocol.test('https://ipfs/QmQqzMTavQgT4f4T5v6PWBp7XNKtoPmC9jvn12WPT3gkSE')).to.be.false;
            expect(links.ipfsProtocol.test('ipfs/QmQqzMTavQgT4f4T5v6PWBp7XNKtoPmC9jvn12WPT3gkSE')).to.be.false;
            expect(links.ipfsProtocol.test('ipfs:/QmQqzMTavQgT4f4T5v6PWBp7XNKtoPmC9jvn12WPT3gkSE')).to.be.false;
        });

        it('should not match non-ipfs url', () => {
            expect(links.ipfsProtocol.test('https://www.engrave.dev')).to.be.false;
            expect(links.ipfsProtocol.test('http://www.engrave.dev')).to.be.false;
            expect(links.ipfsProtocol.test('www.engrave.dev')).to.be.false;
            expect(links.ipfsProtocol.test('engrave.dev')).to.be.false;
            expect(links.ipfsProtocol.test('engrave')).to.be.false;
        });
    });

    describe('isLocalUrl', () => {
        it('should accept hive.blog, its subdomains and localhost', () => {
            for (const url of [
                'https://hive.blog/a.jpg',
                'https://images.hive.blog/p/abc',
                'https://hive.blog:8080/a.jpg',
                '//images.hive.blog/p/abc',
                'http://localhost:3000/a.jpg'
            ]) {
                expect(isLocalUrl(url), url).to.be.true;
            }
        });

        it('should reject a URL whose browser-parsed host is not hive.blog', () => {
            for (const url of [
                'https://x.example/i.jpg?u=https://hive.blog',
                'https://hive.blog.x.example/i.jpg',
                'https://evilhive.blog/i.jpg',
                'https://hiveXblog/i.jpg',
                'https://localhost.x.example/i.jpg',
                'https://hive.blog@x.example/i.jpg',
                'https://images.hive.blog:@x.example/i.jpg',
                '//hive.blog@x.example/i.jpg',
                'https://user@hive.blog/i.jpg',
                'https://hive.blog\tx.example/i.jpg',
                'https://hive.blog\n.x.example/i.jpg',
                'https://[::1/i.jpg'
            ]) {
                expect(isLocalUrl(url), url).to.be.false;
            }
        });
    });
});
