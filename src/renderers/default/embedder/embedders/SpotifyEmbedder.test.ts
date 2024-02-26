import {expect} from 'chai';
import {SpotifyEmbedder} from './SpotifyEmbedder';

describe('SpotifyEmbedder', () => {
    [
        {
            description: 'should properly return metadata for spotify playlist',
            input: 'https://open.spotify.com/playlist/1zLvUhumbFIEdfxYQcgUxk',
            expected: {
                image: 'https://open.spotify.com/playlist/1zLvUhumbFIEdfxYQcgUxk',
                id: 'embed/playlist/1zLvUhumbFIEdfxYQcgUxk',
                url: 'https://open.spotify.com/playlist/1zLvUhumbFIEdfxYQcgUxk'
            }
        },
        {
            description: 'should properly return metadata for spotify show',
            input: 'https://open.spotify.com/show/1zLvUhumbFIEdfxYQcgUxk',
            expected: {
                image: 'https://open.spotify.com/show/1zLvUhumbFIEdfxYQcgUxk',
                id: 'embed-podcast/show/1zLvUhumbFIEdfxYQcgUxk',
                url: 'https://open.spotify.com/show/1zLvUhumbFIEdfxYQcgUxk'
            }
        },
        {
            description: 'should properly return metadata for spotify episode',
            input: 'https://open.spotify.com/episode/1zLvUhumbFIEdfxYQcgUxk',
            expected: {
                image: 'https://open.spotify.com/episode/1zLvUhumbFIEdfxYQcgUxk',
                id: 'embed-podcast/episode/1zLvUhumbFIEdfxYQcgUxk',
                url: 'https://open.spotify.com/episode/1zLvUhumbFIEdfxYQcgUxk'
            }
        },
        {
            description: 'should properly return metadata for spotify album',
            input: 'https://open.spotify.com/album/1zLvUhumbFIEdfxYQcgUxk',
            expected: {
                image: 'https://open.spotify.com/album/1zLvUhumbFIEdfxYQcgUxk',
                id: 'embed/album/1zLvUhumbFIEdfxYQcgUxk',
                url: 'https://open.spotify.com/album/1zLvUhumbFIEdfxYQcgUxk'
            }
        },
        {
            description: 'should properly return metadata for spotify track',
            input: 'https://open.spotify.com/track/1zLvUhumbFIEdfxYQcgUxk',
            expected: {
                image: 'https://open.spotify.com/track/1zLvUhumbFIEdfxYQcgUxk',
                id: 'embed/track/1zLvUhumbFIEdfxYQcgUxk',
                url: 'https://open.spotify.com/track/1zLvUhumbFIEdfxYQcgUxk'
            }
        },
        {
            description: 'should properly return metadata for spotify artist',
            input: 'https://open.spotify.com/artist/1zLvUhumbFIEdfxYQcgUxk',
            expected: {
                image: 'https://open.spotify.com/artist/1zLvUhumbFIEdfxYQcgUxk',
                id: 'embed/artist/1zLvUhumbFIEdfxYQcgUxk',
                url: 'https://open.spotify.com/artist/1zLvUhumbFIEdfxYQcgUxk'
            }
        },
        {
            description: 'should return undefined for invalid input',
            input: 'https://open.spotify.com/invalid/1zLvUhumbFIEdfxYQcgUxk',
            expected: undefined
        },
        {
            description: 'should return undefined for empty input',
            input: '',
            expected: undefined
        },
        {
            description: 'should return undefined for undefined input',
            input: undefined,
            expected: undefined
        }
    ].forEach((test) => {
        it(test.description, () => {
            const embedder = new SpotifyEmbedder();
            const node = {data: test.input} as HTMLObjectElement;
            const result = embedder.getEmbedMetadata(node);

            expect(result).to.be.deep.equal(test.expected);
        });
    });

    it('should properly process embed', () => {
        const embedder = new SpotifyEmbedder();
        const result = embedder.processEmbed('embed/playlist/1zLvUhumbFIEdfxYQcgUxk', {width: 300, height: 300});
        const expected =
            '<div class="videoWrapper"><iframe src="https://open.spotify.com/embed/playlist/1zLvUhumbFIEdfxYQcgUxk" width="300" height="300" frameBorder="0" webkitallowfullscreen mozallowfullscreen allowfullscreen ></iframe></div>';

        expect(result).to.be.equal(expected);
    });

    it('should log exceptions and return undefined', () => {
        // mock SpotifyEmbedder.extractMetadata to throw an exception
        const extractMetadata = SpotifyEmbedder['extractMetadata'];
        SpotifyEmbedder['extractMetadata'] = () => {
            throw new Error('mock error');
        };
        const embedder = new SpotifyEmbedder();
        const node = {data: 'https://open.spotify.com/playlist/1zLvUhumbFIEdfxYQcgUxk'} as HTMLObjectElement;
        const result = embedder.getEmbedMetadata(node);

        expect(result).to.be.undefined;
        SpotifyEmbedder['extractMetadata'] = extractMetadata;
    });
});
