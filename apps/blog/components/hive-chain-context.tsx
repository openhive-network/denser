import { FC, PropsWithChildren, createContext, useContext, useEffect, useState } from 'react';
import { IHiveChainInterface, createHiveChain } from '@hive/wax/web';

type HiveChainContextType = {
  hiveChain: IHiveChainInterface | undefined;
  setHiveChain: (hiveChain: IHiveChainInterface) => void;
};

const HiveChainContext = createContext<HiveChainContextType>({
  hiveChain: undefined,
  setHiveChain: () => {}
});

export const useHiveChainContext = () => useContext(HiveChainContext);
export const HiveChainProvider: FC<PropsWithChildren> = ({ children }) => {
  const [hiveChain, setHiveChain] = useState<IHiveChainInterface | undefined>(undefined);
  const createChain = async () => {
    const chain = await createHiveChain();
    setHiveChain(chain);
  };

  useEffect(() => {
    createChain();
  }, []);
  return (
    <HiveChainContext.Provider value={{ hiveChain, setHiveChain }}>{children}</HiveChainContext.Provider>
  );
};
