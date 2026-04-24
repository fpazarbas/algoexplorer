import { useEffect, useState, createContext, ReactNode } from 'react';
import Web3Modal from 'web3modal';
// import { ethers } from 'ethers';
import algosdk from 'algosdk';

const web3modalStorageKey = 'WEB3_CONNECT_CACHED_PROVIDER';

export const WalletContext = createContext<any>({});

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [address, setAddress] = useState<string | null>(null);
  // const [address, setAddress] = useState<string | undefined>(undefined);
  const [balance, setBalance] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(false);
  const [isconnected, setConnect] = useState<boolean>(false);

  const disconnectWallet = () => {
    setAddress(null);
  };

  const subscribeProvider = async (connection: any) => {
    connection.on('close', () => {
      disconnectWallet();
    });
    connection.on('accountsChanged', async (accounts: string[]) => {
      if (accounts?.length) {
        setAddress(accounts[0]);
      } else {
        disconnectWallet();
      }
    });
  };

  return (
    <WalletContext.Provider
      value={{
        address,
        balance,
        loading,
        // error,
        isconnected,
        disconnectWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
