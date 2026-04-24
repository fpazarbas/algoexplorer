import { Bitcoin } from '@/components/icons/bitcoin';
import { Ethereum } from '@/components/icons/ethereum';
import { Tether } from '@/components/icons/tether';
import { Bnb } from '@/components/icons/bnb';
import { Usdc } from '@/components/icons/usdc';
import { Cardano } from '@/components/icons/cardano';
import { Doge } from '@/components/icons/doge';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Scrollbar from '@/components/ui/scrollbar';
import { string } from 'yup';
import CoinIcon, { asaList, coinList } from '../static/coin-list';
import { microalgosToAlgos } from 'algosdk';

interface Props {
  data: CurrencyData[];
}

interface Asset {
  params: {
    name: string;
    decimals : number;
  };
}

interface ResponseData {
  data: {
    params: {
      name: string;
      decimals : number;
      'unit-name': string;
       url:string;
    };
  };
}
interface Props {
  assets: any[];
  algoAmount : number;
}
const CurrencyTable: React.FC<Props> = ({ assets , algoAmount}) => {
  const [currencyData, setCurrencyData] = useState<CurrencyData[]>([]);

  useEffect(() => {
    const fetchData = async () => {
    

      try {
     
       
          coinList.push({
            id : 0,
            icon : <CoinIcon urlAsset={"https://asa-list.tinyman.org/assets/0/icon.png"} alt={ "Algo"}/>,
            code : "Algo",
            name : "Algorand",
            amount : algoAmount,
            decimals : 9,
            price : 0
          })
          const currencyData: CurrencyData[] = [];
          currencyData.push({
            id: "0",
            coin:{
              icon: <CoinIcon urlAsset={"https://asa-list.tinyman.org/assets/0/icon.png"} alt={ "Algo"}/> ,
              name:"Algorand",
              amount : algoAmount,
              decimals:9
            }
          })
      
        for (const asset of assets) {
          const response2: ResponseData = await axios.get(
            `https://mainnet-api.algonode.cloud/v2/assets/${asset}`
          );
          console.log(asaList.length);
          const assetLocal = asaList.find(x=> x.id === asset);
          if (assetLocal != null) {
            const alt = assetLocal.name;
            const decimals = response2.data.params.decimals;
            const code = response2.data.params['unit-name'];
            const url = response2.data.params.url;
            const name  = response2.data.params.name
            const icon  = assetLocal.icon;
            let amount = assetLocal.amount;
            console.log(amount);
  
            if (amount > 0.0) {
              currencyData.push({
                id:  assetLocal.id.toString(),
                coin: {
                  icon : icon,
                  name: name,
                  amount: amount,
                  decimals : decimals
                },
              });
            }
            if (!url?.includes("ipfs:")) {
              if (!url?.includes("https://tinyman.org")) {
               const checkId = coinList.some(item => item.id === assetLocal.id)
                coinList.push({
                  id : assetLocal.id,
                  icon : <CoinIcon urlAsset= {url} alt={alt || ""}/>,
                  code : code,
                  name : name,
                  amount : amount,
                  decimals: decimals,
                  price : 0
            
                 })
               
              }
            }
          }
          

        }

        setCurrencyData(currencyData);
      } catch (error) {
        console.error(error);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="">
      <div className="rounded-tl-lg rounded-tr-lg bg-white px-4 pt-6 dark:bg-light-dark md:px-8 md:pt-8">
        <div className="flex flex-col items-center justify-between border-b border-dashed border-gray-200 pb-5 dark:border-gray-700 md:flex-row">
          <h2 className="mb-3 shrink-0 text-lg font-medium uppercase text-black dark:text-white sm:text-xl md:mb-0 md:text-2xl">
            My Assets
          </h2>
        </div>
      </div>
      <div className="-mx-0.5 dark:[&_.os-scrollbar_.os-scrollbar-track_.os-scrollbar-handle:before]:!bg-white/50">
        <Scrollbar style={{ width: '100%' }} autoHide="never">
          <div className="px-0.5">
            <table className="transaction-table w-full border-separate border-0">
              <thead className="text-sm text-gray-500 dark:text-gray-300">
                <tr>
                  <th className="group bg-white px-2 py-5 font-normal first:rounded-bl-lg last:rounded-br-lg ltr:first:pl-8 ltr:last:pr-8 rtl:first:pr-8 rtl:last:pl-8 dark:bg-light-dark md:px-4">
                    {' '}
                    Name
                  </th>
                  <th className="group bg-white px-2 py-5 font-normal first:rounded-bl-lg last:rounded-br-lg ltr:first:pl-8 ltr:last:pr-8 rtl:first:pr-8 rtl:last:pl-8 dark:bg-light-dark md:px-4">
                    ID
                  </th>
                  <th className="group bg-white px-2 py-5 font-normal first:rounded-bl-lg last:rounded-br-lg ltr:first:pl-8 ltr:last:pr-8 rtl:first:pr-8 rtl:last:pl-8 dark:bg-light-dark md:px-4">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="text-xs font-medium text-gray-900 dark:text-white 3xl:text-sm">
                {currencyData.map((currency) => (
                  
                  <tr
                    className="mb-3 items-center rounded-lg bg-white uppercase shadow-card last:mb-0 dark:bg-light-dark"
                    key={currency.id.toString()}
                  >

                    <td className="px-2 py-4 tracking-[1px] ltr:first:pl-4 ltr:last:pr-4 rtl:first:pr-8 rtl:last:pl-8 md:px-4 md:py-6 md:ltr:first:pl-8 md:ltr:last:pr-8 3xl:py-5">
                    <div className="flex flex-col items-center gap-3 md:flex-row">
                      {currency.coin.icon}  {currency.coin.name}
                      </div> 
                    </td>
                    <td className="px-2 py-4 tracking-[1px] ltr:first:pl-4 ltr:last:pr-4 rtl:first:pr-8 rtl:last:pl-8 md:px-4 md:py-6 md:ltr:first:pl-8 md:ltr:last:pr-8 3xl:py-5">
                      {' '}
                      {currency.id}{' '}
                    </td>
                    <td className="px-2 py-4 tracking-[1px] ltr:first:pl-4 ltr:last:pr-4 rtl:first:pr-8 rtl:last:pl-8 md:px-4 md:py-6 md:ltr:first:pl-8 md:ltr:last:pr-8 3xl:py-5">
                      {
                      currency.coin.amount.toFixed(2).toString()
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Scrollbar>
      </div>
    </div>
  );
};

export default CurrencyTable;

interface CurrencyData {
  id: String;
  coin: Coin;
}
interface Coin {
  icon : JSX.Element,
  name: String;
  amount: Number;
  decimals : Number;
}
