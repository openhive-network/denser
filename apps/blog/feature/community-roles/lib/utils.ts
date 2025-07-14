export type User = { value: number; role: Roles; name: string; title: string };

export type Roles = 'owner' | 'admin' | 'mod' | 'member' | 'guest' | 'muted';

export const rolesLevels = [
  { name: 'owner', value: 6 },
  { name: 'admin', value: 5 },
  { name: 'mod', value: 4 },
  { name: 'member', value: 3 },
  { name: 'guest', value: 2 },
  { name: 'muted', value: 1 }
];

export const getRoleValue = (role: Roles): number => {
  switch (role) {
    case 'owner':
      return 6;
    case 'admin':
      return 5;
    case 'mod':
      return 4;
    case 'member':
      return 3;
    case 'guest':
      return 2;
    case 'muted':
      return 1;
    default:
      return 2;
  }
};
