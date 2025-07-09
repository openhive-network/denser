export type User = { value: number; role: string; name: string; title: string };

export const rolesLevels = [
  { name: 'owner', value: 6 },
  { name: 'admin', value: 5 },
  { name: 'mod', value: 4 },
  { name: 'member', value: 3 },
  { name: 'guest', value: 2 },
  { name: 'muted', value: 1 }
];
