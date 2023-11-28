'use client';

import { createContext, FC, ReactNode, useContext } from 'react';

type AuthContextProps = {
  loginChallenge: string;
};

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
  loginChallenge: string;
};

export const AuthProvider: FC<AuthProviderProps> = ({ children, loginChallenge }) => {
  return <AuthContext.Provider value={{ loginChallenge }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  //   if (!context) {
  //     throw new Error('useAuth must be used within an AuthProvider');
  //   }
  return context;
};
