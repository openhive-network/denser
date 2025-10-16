export const getTwitterInfo = async (username: string) => {
  const response = await fetch(`https://hiveposh.com/api/v0/twitter/${username}`);
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
