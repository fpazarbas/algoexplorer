import Image from '@/components/ui/image';
import peraLogo from '@/assets/images/button-pera-connect.svg';
import { useState, useEffect } from 'react';
import Button from '@/components/ui/button';
import { PeraWalletConnect } from '@perawallet/connect';
import cn from 'classnames';
import axios from 'axios';


let walletInstance: PeraWalletConnect;

if (typeof window !== 'undefined') {
  if (!(window as any)._peraWalletInstance) {
    (window as any)._peraWalletInstance = new PeraWalletConnect();
  }
  walletInstance = (window as any)._peraWalletInstance;
} else {
  // SSR fallback
  walletInstance = new PeraWalletConnect(); 
}

export const peraWallet = walletInstance;
interface ResponseData {
  appID: number
  caAlgo: string[]
  depositAccount: string
  name: string
  owner: string
  properties: Properties
  state: string
  timeChanged: string
}
export interface Properties {}
export default function PeraConnect({
  btnClassName,
  anchorClassName,
}: {
  btnClassName?: string;
  anchorClassName?: string;
}) {
  const [accountAddress, setAccountAddress] = useState<string | null>(null);
  const isConnectedToPeraWallet = !!accountAddress;
  const [isconnected, setConnect] = useState<boolean>(false);

  
  useEffect(() => {
    // Reconnect to the session when the component is mounted
    peraWallet
      .reconnectSession()
      .then(async (accounts) => {
        // Setup the disconnect event listener
        peraWallet.connector?.on('disconnect', handleDisconnectWalletClick);

        if (peraWallet.isConnected && accounts.length) {
          setAccountAddress(accounts[0]);
          setConnect(true);
        }
      })
      .catch((error) => {
        console.log(error);
        if (error?.data?.type !== 'CONNECT_MODAL_CLOSED') {
          // log the necessary errors
        }
      });
  }, []);

  return (
    <Button
      shape="rounded"
      color="info"
      size="mini"
      className={cn('!bg-[#1b72e8] hover:!bg-blue-600 !text-white !font-semibold !shadow-none !text-xs sm:!text-xs !tracking-normal transition-colors border-0 !py-1.5 !px-3 !h-auto', btnClassName)}
      onClick={
        isConnectedToPeraWallet
          ? handleDisconnectWalletClick
          : handleConnectWalletClick
      }
    >
      {isconnected ? 'Disconnect' : 'Connect'}
    </Button>
  );

  function handleConnectWalletClick() {
    peraWallet
      .connect()
      .then((newAccounts) => {
        // Setup the disconnect event listener
        peraWallet.connector?.on('disconnect', handleDisconnectWalletClick);
        setConnect(true);
        
        setAccountAddress(newAccounts[0]);
        window.location.reload(); 
      })
      .catch((error) => {
        if (error?.data?.type !== 'CONNECT_MODAL_CLOSED') {
          // log the necessary errors
          console.log(error);
        }
      });
    
  }

  function handleDisconnectWalletClick() {
    peraWallet.disconnect().catch((error) => {
      if (error?.data?.type !== 'CONNECT_MODAL_CLOSED') {
        // log the necessary errors
        console.log(error);
        
      }
    });
    setAccountAddress(null);
    setConnect(false);
    window.location.reload(); 
  }
}
export const MY_STRING = "Hello World";