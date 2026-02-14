import {expect} from 'chai';
import {LinkSanitizer} from './LinkSanitizer';

describe('LinkSanitizer', () => {
    it('should allow valid link', () => {
        const linkSanitizer = new LinkSanitizer({baseUrl: 'https://hive.blog/'});

        const sanitizedLink = linkSanitizer.sanitizeLink('https://hive.blog/@engrave', '@engrave');

        expect(sanitizedLink).to.equal('https://hive.blog/@engrave');
    });

    it('should prepend protocol link if not exists', () => {
        const linkSanitizer = new LinkSanitizer({baseUrl: 'https://hive.blog/'});

        const sanitizedLink = linkSanitizer.sanitizeLink('hive.blog/@engrave', 'engrave');

        expect(sanitizedLink).to.equal('https://hive.blog/@engrave');
    });

    it("should prevent links to different domain than it's title (pseudo local link)", () => {
        const linkSanitizer = new LinkSanitizer({baseUrl: 'https://hive.blog/'});

        const sanitizedLink = linkSanitizer.sanitizeLink('https://example.com/@engrave', 'https://hive.blog/@engrave');

        expect(sanitizedLink).to.equal(false);
    });

    // TODO: Fix phishing domain detection - see #801
    it.skip(`should prevent phishing domain`, () => {
        const linkSanitizer = new LinkSanitizer({baseUrl: 'https://hive.blog/'});

        const sanitizedLink = linkSanitizer.sanitizeLink('https://stemit.com/', 'https://stemit.com/');

        expect(sanitizedLink).to.equal(false);
    });
});

describe('LinkSanitizer.isPrivateNetworkUrl', () => {
    const originalNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
        process.env.NODE_ENV = originalNodeEnv;
    });

    describe('in production mode', () => {
        beforeEach(() => {
            process.env.NODE_ENV = 'production';
        });

        describe('localhost variants', () => {
            it('should block localhost', () => {
                expect(LinkSanitizer.isPrivateNetworkUrl('http://localhost/')).to.equal(true);
                expect(LinkSanitizer.isPrivateNetworkUrl('http://localhost:3000/')).to.equal(true);
                expect(LinkSanitizer.isPrivateNetworkUrl('https://localhost/path')).to.equal(true);
            });

            it('should block localhost.localdomain', () => {
                expect(LinkSanitizer.isPrivateNetworkUrl('http://localhost.localdomain/')).to.equal(true);
            });
        });

        describe('IPv4 loopback (127.0.0.0/8)', () => {
            it('should block 127.0.0.1', () => {
                expect(LinkSanitizer.isPrivateNetworkUrl('http://127.0.0.1/')).to.equal(true);
                expect(LinkSanitizer.isPrivateNetworkUrl('http://127.0.0.1:8080/api')).to.equal(true);
            });

            it('should block entire 127.x.x.x range', () => {
                expect(LinkSanitizer.isPrivateNetworkUrl('http://127.255.255.255/')).to.equal(true);
                expect(LinkSanitizer.isPrivateNetworkUrl('http://127.1.2.3/')).to.equal(true);
            });
        });

        describe('IPv4 Class A private (10.0.0.0/8)', () => {
            it('should block 10.x.x.x addresses', () => {
                expect(LinkSanitizer.isPrivateNetworkUrl('http://10.0.0.1/')).to.equal(true);
                expect(LinkSanitizer.isPrivateNetworkUrl('http://10.255.255.255/')).to.equal(true);
                expect(LinkSanitizer.isPrivateNetworkUrl('http://10.1.2.3:9000/')).to.equal(true);
            });
        });

        describe('IPv4 Class B private (172.16.0.0/12)', () => {
            it('should block 172.16.x.x - 172.31.x.x addresses', () => {
                expect(LinkSanitizer.isPrivateNetworkUrl('http://172.16.0.1/')).to.equal(true);
                expect(LinkSanitizer.isPrivateNetworkUrl('http://172.31.255.255/')).to.equal(true);
                expect(LinkSanitizer.isPrivateNetworkUrl('http://172.20.10.5/')).to.equal(true);
            });

            it('should allow 172.15.x.x and 172.32.x.x (outside private range)', () => {
                expect(LinkSanitizer.isPrivateNetworkUrl('http://172.15.0.1/')).to.equal(false);
                expect(LinkSanitizer.isPrivateNetworkUrl('http://172.32.0.1/')).to.equal(false);
            });
        });

        describe('IPv4 Class C private (192.168.0.0/16)', () => {
            it('should block 192.168.x.x addresses', () => {
                expect(LinkSanitizer.isPrivateNetworkUrl('http://192.168.0.1/')).to.equal(true);
                expect(LinkSanitizer.isPrivateNetworkUrl('http://192.168.1.1/')).to.equal(true);
                expect(LinkSanitizer.isPrivateNetworkUrl('http://192.168.255.255/')).to.equal(true);
            });

            it('should allow other 192.x.x.x addresses', () => {
                expect(LinkSanitizer.isPrivateNetworkUrl('http://192.167.1.1/')).to.equal(false);
                expect(LinkSanitizer.isPrivateNetworkUrl('http://192.169.1.1/')).to.equal(false);
            });
        });

        describe('IPv4 link-local (169.254.0.0/16)', () => {
            it('should block 169.254.x.x addresses', () => {
                expect(LinkSanitizer.isPrivateNetworkUrl('http://169.254.0.1/')).to.equal(true);
                expect(LinkSanitizer.isPrivateNetworkUrl('http://169.254.169.254/')).to.equal(true); // AWS metadata
            });
        });

        describe('IPv4 current network (0.0.0.0/8)', () => {
            it('should block 0.x.x.x addresses', () => {
                expect(LinkSanitizer.isPrivateNetworkUrl('http://0.0.0.0/')).to.equal(true);
                expect(LinkSanitizer.isPrivateNetworkUrl('http://0.0.0.1/')).to.equal(true);
            });
        });

        describe('IPv6 addresses', () => {
            it('should block IPv6 loopback (::1)', () => {
                expect(LinkSanitizer.isPrivateNetworkUrl('http://[::1]/')).to.equal(true);
                expect(LinkSanitizer.isPrivateNetworkUrl('http://[::1]:3000/')).to.equal(true);
            });

            it('should block IPv6 link-local (fe80::)', () => {
                expect(LinkSanitizer.isPrivateNetworkUrl('http://[fe80::1]/')).to.equal(true);
                expect(LinkSanitizer.isPrivateNetworkUrl('http://[fe80:0:0:0:0:0:0:1]/')).to.equal(true);
            });

            it('should block IPv6 unique local (fc00::/7, fd00::/8)', () => {
                expect(LinkSanitizer.isPrivateNetworkUrl('http://[fc00::1]/')).to.equal(true);
                expect(LinkSanitizer.isPrivateNetworkUrl('http://[fd12:3456:789a::1]/')).to.equal(true);
            });
        });

        describe('IPv4-mapped IPv6 addresses', () => {
            it('should block loopback via IPv4-mapped IPv6', () => {
                expect(LinkSanitizer.isPrivateNetworkUrl('http://[::ffff:127.0.0.1]/')).to.equal(true);
                expect(LinkSanitizer.isPrivateNetworkUrl('http://[::ffff:127.0.0.1]:8090/')).to.equal(true);
            });

            it('should block private ranges via IPv4-mapped IPv6', () => {
                expect(LinkSanitizer.isPrivateNetworkUrl('http://[::ffff:10.0.0.1]/')).to.equal(true);
                expect(LinkSanitizer.isPrivateNetworkUrl('http://[::ffff:192.168.1.1]/')).to.equal(true);
                expect(LinkSanitizer.isPrivateNetworkUrl('http://[::ffff:172.16.0.1]/')).to.equal(true);
            });

            it('should block link-local via IPv4-mapped IPv6', () => {
                expect(LinkSanitizer.isPrivateNetworkUrl('http://[::ffff:169.254.169.254]/')).to.equal(true);
            });

            it('should allow public IPs via IPv4-mapped IPv6', () => {
                expect(LinkSanitizer.isPrivateNetworkUrl('http://[::ffff:8.8.8.8]/')).to.equal(false);
                expect(LinkSanitizer.isPrivateNetworkUrl('http://[::ffff:1.1.1.1]/')).to.equal(false);
            });
        });

        describe('public addresses (should NOT block)', () => {
            it('should allow public domains', () => {
                expect(LinkSanitizer.isPrivateNetworkUrl('https://hive.blog/')).to.equal(false);
                expect(LinkSanitizer.isPrivateNetworkUrl('https://example.com/')).to.equal(false);
                expect(LinkSanitizer.isPrivateNetworkUrl('https://api.openhive.network/')).to.equal(false);
            });

            it('should allow public IPv4 addresses', () => {
                expect(LinkSanitizer.isPrivateNetworkUrl('http://8.8.8.8/')).to.equal(false);
                expect(LinkSanitizer.isPrivateNetworkUrl('http://1.1.1.1/')).to.equal(false);
                expect(LinkSanitizer.isPrivateNetworkUrl('http://203.0.113.1/')).to.equal(false);
            });

            it('should allow public IPv6 addresses', () => {
                expect(LinkSanitizer.isPrivateNetworkUrl('http://[2001:4860:4860::8888]/')).to.equal(false);
            });
        });

        describe('edge cases', () => {
            it('should handle invalid URLs gracefully', () => {
                expect(LinkSanitizer.isPrivateNetworkUrl('not-a-url')).to.equal(false);
                expect(LinkSanitizer.isPrivateNetworkUrl('')).to.equal(false);
            });

            it('should handle URLs with paths and query strings', () => {
                expect(LinkSanitizer.isPrivateNetworkUrl('http://localhost/api/v1?key=value')).to.equal(true);
                expect(LinkSanitizer.isPrivateNetworkUrl('http://192.168.1.1/admin#section')).to.equal(true);
            });
        });
    });

    describe('in development mode', () => {
        beforeEach(() => {
            process.env.NODE_ENV = 'development';
        });

        it('should allow localhost in dev mode', () => {
            expect(LinkSanitizer.isPrivateNetworkUrl('http://localhost/')).to.equal(false);
            expect(LinkSanitizer.isPrivateNetworkUrl('http://localhost:3000/')).to.equal(false);
        });

        it('should allow private IPs in dev mode', () => {
            expect(LinkSanitizer.isPrivateNetworkUrl('http://127.0.0.1/')).to.equal(false);
            expect(LinkSanitizer.isPrivateNetworkUrl('http://192.168.1.1/')).to.equal(false);
            expect(LinkSanitizer.isPrivateNetworkUrl('http://10.0.0.1/')).to.equal(false);
        });
    });

    describe('in test mode', () => {
        beforeEach(() => {
            process.env.NODE_ENV = 'test';
        });

        it('should allow private network URLs in test mode', () => {
            expect(LinkSanitizer.isPrivateNetworkUrl('http://localhost/')).to.equal(false);
            expect(LinkSanitizer.isPrivateNetworkUrl('http://127.0.0.1/')).to.equal(false);
        });
    });
});
