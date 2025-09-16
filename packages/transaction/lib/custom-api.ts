export const getTwitterInfo = async (username: string) => {
  const response = await fetch(`https://hiveposh.com/api/v0/twitter/${username}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Posh API Error: ${response.status}`);
  }

  const data = await response.json();
  const { error } = data;
  if (error) {
    throw new Error(`Posh API Error: ${error}`);
  }

  return data;
};

export const getHivebuzzBadges = async (username: string) => {
  const response = await fetch(`https://hivebuzz.me/api/badges/${username}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Hivebuzz API Error: ${response.status}`);
  }

  const data = await response.json();
  return data.filter((badge: { state: string }) => badge.state === 'on');
};

export const getPeakdBadges = async (username: string) => {
  const response = await fetch(`https://peakd.com/api/public/badge/${username}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Peakd API Error: ${response.status}`);
  }

  const data = await response.json();
  return data.map((obj: { name: string; title: string }) => ({
    id: obj.title,
    name: obj.name,
    title: obj.title
  }));
};
