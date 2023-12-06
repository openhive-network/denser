import { User } from '@/auth/types/common';

const USER_LOCAL_STORAGE_KEY = 'user';

export function saveUser(user: User | null | undefined): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_LOCAL_STORAGE_KEY, JSON.stringify(user));
  }
}

export function getUser(): User | undefined {
  if (typeof window !== 'undefined') {
    const user = localStorage.getItem(USER_LOCAL_STORAGE_KEY);
    return user ? JSON.parse(user) : undefined;
  }
}

export function removeUser(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(USER_LOCAL_STORAGE_KEY);
  }
}
