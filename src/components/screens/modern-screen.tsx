import cn from 'classnames';
import { NextSeo } from 'next-seo';
import OverviewChart from '@/components/ui/chats/overview-chart';
import VolumeChart from '@/components/ui/chats/volume-chart';
import TopPools from '@/components/ui/top-pools';
import TransactionTable from '@/components/transaction/transaction-table';
import { useState, useEffect } from 'react';

//images
import PriceDataChart from '@/data/dynamic/priceData';
import Holders from '@/data/dynamic/holders';
import MaxSupply from '@/data/dynamic/maxSupply';
import CirculatingSupply from '@/data/dynamic/circulatingSupply';
import { peraWallet } from '@/data/dynamic/peraConnect';
import GetMyAssets from '@/data/dynamic/currency-data';
import CurrencyTable from '@/data/dynamic/currency-data';
import Button from '../ui/button';
import Link from 'next/link';
import LiveDemo from '@/pages/live-pricing';
import axios from 'axios';
import { getASAPriceDataList } from '@/data/static/price-feed';
import { microalgosToAlgos } from 'algosdk';
import { getAsaList } from '@/data/static/coin-list';
import { AdvancedRealTimeChart } from "react-ts-tradingview-widgets";
import { Ticker, CopyrightStyles } from "react-ts-tradingview-widgets";

export default function ModernScreen() {
  const [error, setError] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [circulating, setCirculating] = useState(0);
  const [maxSupply, setMax] = useState(0);
  const [accountAddress, setAccountAddress] = useState<string | null>(null);
  const [algoAmount,setAlgoAmount] = useState(0);
  const [assetIds , setAssetIds] = useState<any[]| null>(null);
  const [asalistResponse, setasaListResponse] = useState(false);
  useEffect(() => {
   
    
    let idList: any[] = [];
    let walletAddress = "";
    peraWallet
      .reconnectSession()
      .then((accounts) => {
        // Setup the disconnect event listener

        if (peraWallet.isConnected && accounts.length) {
          setAccountAddress(accounts[0]);
          walletAddress =  accounts[0];
          fetchData();
        }else{
          getPriceFeed();
        }
        
      })
      .catch((error) => {
        console.log(error);
        if (error?.data?.type !== 'CONNECT_MODAL_CLOSED') {
          // log the necessary errors
          getPriceFeed();
        }
      });
      const  getPriceFeed = async () => {
        const asaList =  await getASAPriceDataList(idList);
        setasaListResponse(true);
      }

      const  getAlgoPrice = async () => {
        const asaList =  await getAlgoPrice();
      }
      
      const fetchData = async () => {
        try {
          await getAsaList();
          const result = await axios.get(
            'https://mainnet-api.algonode.cloud/v2/accounts/' + walletAddress
          );
          const assets = result.data.assets;
          for (const asset of assets) {
            idList.push(asset['asset-id']);
          }
         
        }catch(error){
         console.log(error);
        }

        const algoResponse = await axios.get(
          'https://mainnet-api.algonode.cloud/v2/accounts/' + walletAddress
        );
        const assets = algoResponse.data.assets;
        setAssetIds(idList);
        const algoAmount = microalgosToAlgos(algoResponse.data.amount);
        setAlgoAmount(algoAmount);
        getPriceFeed();
      }
      
  }, []);

  return (
    <>
      <NextSeo
        title="KOC"
        description="KOC - Algorand - Launchpad | Defi | NFTs"
      />
      
      <LiveDemo/>
      {/* <div className="flex flex-wrap gap-3">
        <div className="w-full sm:w-1/2 md:w-64 lg:w-72 2xl:w-80 3xl:w-[358px]">
          
          <div className="flex h-full flex-col justify-center rounded-lg bg-white p-6 shadow-card dark:bg-light-dark xl:p-8">
            <h3 className="mb-2 text-center text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400 3xl:mb-3">
              Buy Koc
            </h3>
            <div className="flex flex-wrap gap-3">
              
            <PriceDataChart assetId='1035899249'/>
            {/* <Button onClick={() =>  window.open("https://kocalgo.com/swap/")}  shape="rounded">Buy</Button>
            
            <Button onClick={() => window.open("https://app.tinyman.org/#/pool/YKXK4DGIMZUZQYVKSDH6DNFTFWQDFUYI6IMYX6IHLA5NITACES3NU6ZO5U", '_blank')} shape="rounded">Provide Liqudity</Button>
            
            <Button onClick={() => window.open("  https://app.cometa.farm/", '_blank')} shape="rounded">Earn</Button>
           
            </div>
          </div>
        </div>
        {/* <div className="w-full sm:w-1/2 md:w-64 lg:w-72 2xl:w-80 3xl:w-[358px]">
          <div className="flex h-full flex-col justify-center rounded-lg bg-white p-6 shadow-card dark:bg-light-dark xl:p-8">
            <h3 className="mb-2 text-center text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400 3xl:mb-3">
              Max Supply
            </h3>
            <MaxSupply maxSuppy={maxSupply} />
            <TopupButton /> 
          </div>
        </div>
        <div className="w-full sm:w-1/2 md:w-64 lg:w-72 2xl:w-80 3xl:w-[358px]">
          <div className="flex h-full flex-col justify-center rounded-lg bg-white p-6 shadow-card dark:bg-light-dark xl:p-8">
            <h3 className="mb-2 text-center text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400 3xl:mb-3">
              Circulating Supply
            </h3>
            <CirculatingSupply CirculatingSupply={circulating} />
            <TopupButton /> 
          </div>
        </div> */}
        {/* <div className="w-full sm:w-1/2 md:w-64 lg:w-72 2xl:w-80 3xl:w-[358px]">
          <div className="flex h-full flex-col justify-center rounded-lg bg-white p-6 shadow-card dark:bg-light-dark xl:p-8">
             <Avatar
              image={AuthorImage}
              alt="Author"
              className="mx-auto mb-6"
              size="lg"
            /> 

            <h3 className="mb-2 text-center text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400 3xl:mb-3">
              Total Holders
            </h3>
            <Holders />
            <TopupButton /> 
          </div>
        </div> 
      </div>

      <div className="mt-8 grid gap-6 sm:my-10 md:grid-cols-2">
        <PriceDataChart assetId='1035899249'/>
        <PriceDataChart assetId='0'/>
        <VolumeChart />
      </div> */}

      {/* <div  className="my-8 sm:my-10">
         {assetIds && <CurrencyTable assets={assetIds} algoAmount={algoAmount} data={[]} />} 
      

        
      </div> */}
     <div className='h-full' style={divStyle}>
     <AdvancedRealTimeChart copyrightStyles={styles} range='1D' interval='D' hide_top_toolbar hide_side_toolbar symbol='ALGOUSDT' theme="dark"  autosize></AdvancedRealTimeChart>
     </div>
      
    </>
  );
}
const divStyle = {
  height: '500px', // Set the desired height value
  background: '#f0f0f0', // Just for visualization
  overflow:'hidden'
};

const styles: CopyrightStyles = {
  parent: {
    fontSize: "1px",
    color: "clear",
  },
  link: {
    textDecoration: "line-trough",
  },
  span: {
    color: "darkblue",
  },
};