import {expect} from 'chai';
import links from './Links';

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

    describe('local', () => {
        it('should match hive.blog, its subdomains and localhost', () => {
            expect(links.local.test('https://hive.blog/a.jpg')).to.be.true;
            expect(links.local.test('https://images.hive.blog/p/abc')).to.be.true;
            expect(links.local.test('http://localhost:3000/a.jpg')).to.be.true;
            expect(links.remote.test('https://images.hive.blog/p/abc')).to.be.false;
        });

        it('should not match a URL that only mentions hive.blog outside its host', () => {
            for (const url of [
                'https://x.example/i.jpg?u=https://hive.blog',
                'https://hive.blog.x.example/i.jpg',
                'https://evilhive.blog/i.jpg',
                'https://hiveXblog/i.jpg',
                'https://localhost.x.example/i.jpg'
            ]) {
                expect(links.local.test(url), url).to.be.false;
                expect(links.remote.test(url), url).to.be.true;
            }
        });
    });
});
