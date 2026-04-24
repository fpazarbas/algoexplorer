
import { useState, useEffect } from 'react';
import { peraWallet } from '@/data/dynamic/peraConnect';

export default function Wallet() {
    const [accountAddress, setAccountAddress] = useState<string | null>(null);
    const isConnectedToPeraWallet = !!accountAddress;
    const [isconnected, setConnect] = useState<boolean>(false);
   
    function reConnectSession(){
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
    }

      function handleConnectWalletClick() {
        peraWallet
          .connect()
          .then((newAccounts) => {
            // Setup the disconnect event listener
            peraWallet.connector?.on('disconnect', handleDisconnectWalletClick);
            setConnect(true);
            setAccountAddress(newAccounts[0]);
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
    };
 return {peraWallet,accountAddress,isconnected,isConnectedToPeraWallet,handleConnectWalletClick,handleDisconnectWalletClick,reConnectSession}
}

