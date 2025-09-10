import Apps from '@hiveio/hivescript/apps.json';

function read_md_app(metadata: any) {
  return metadata && metadata.app && typeof metadata.app === 'string' && metadata.app.split('/').length === 2
    ? metadata.app.split('/')[0]
    : null;
}

function read_md_canonical(metadata: any) {
  const url =
    metadata.canonical_url && typeof metadata.canonical_url === 'string' ? metadata.canonical_url : null;

  const saneUrl = new RegExp(/^(hive|https)?:\/\//);
  return saneUrl.test(url) ? url : null;
}

function build_scheme(scheme: string, post: any) {
  // https://github.com/bgornicki/hivescript/blob/master/apps.json
  return scheme
    .split('{category}')
    .join(post.category)
    .split('{username}')
    .join(post.author)
    .split('{permlink}')
    .join(post.permlink);
}

function allowed_app(app: string) {
  // apps which follow (reciprocate) canonical URLs (as of 2020-03-21)
  const whitelist = [
    'hive',
    'hiveblog',
    'peakd',
    'steemit',
    'esteem',
    'ecency',
    'steempeak',
    'travelfeed',
    'leofinance'
  ];
  return whitelist.includes(app);
}

// eslint-disable-next-line import/prefer-default-export
export function makeCanonicalLink(post: any, metadata: any) {
  let scheme;

  if (metadata) {
    const canonUrl = read_md_canonical(metadata);
    if (canonUrl) return canonUrl;

    const app = read_md_app(metadata);

    if (app && allowed_app(app)) {
      const appData = Apps[app as keyof typeof Apps];
      scheme = appData && 'url_scheme' in appData ? appData.url_scheme : null;
    }
  }

  if (!scheme) scheme = Apps.hiveblog.url_scheme;
  return build_scheme(scheme, post);
}
