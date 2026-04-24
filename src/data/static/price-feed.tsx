import BitcoinImage from '@/assets/images/coin/bitcoin.svg';
import TetherImage from '@/assets/images/coin/tether.svg';
import CardanoImage from '@/assets/images/coin/cardano.svg';
import BinanceImage from '@/assets/images/coin/binance.svg';

import { Bitcoin } from '@/components/icons/bitcoin';
import { Tether } from '@/components/icons/tether';
import { Bnb } from '@/components/icons/bnb';
import { Cardano } from '@/components/icons/cardano';
import axios from 'axios';
import CoinIcon, { asaList } from './coin-list';


export const asaPriceListData : any[] = [


]

export async function getAlgoPrice(){
  const response = await axios.get(
    'https://free-api.vestige.fi/currency/USD/prices/simple/7D'
  );
  let algoPrice = response.data[response.data.length - 1].price
  const assetLocal = asaList.find(x=> x.id === 0);
  const currentAmount = assetLocal?.amount ? assetLocal.amount : 0;
    const algoBalans = response.data[response.data.length - 1].price * currentAmount;
    const usdBalans = algoBalans * algoPrice;
    const difference = response.data[response.data.length - 1].price -  response.data[0].price;
    const change = (difference / response.data[0].price) * 100 ;
    const isPositive = difference > 0 ? true : false;
  const algoItem =  {id : 0, name:"Algorand" ,symbol:"Algo",icon:<CoinIcon urlAsset="https://asa-list.tinyman.org/assets/0/icon.png" alt="Algo"/> ,balance:currentAmount,logo:"any",usdBalance:algoBalans.toFixed(2),currentPrice: algoPrice.toFixed(4),algoBalance : currentAmount.toFixed(2) ,isChangePositive:isPositive,change:"%" + change.toFixed(1) ,color:"",prices:[{
    name:0,value: response.data[0]
  }]}
  if (response.data.length > 0) {
    for (let j = 0; j < response.data.length; j++) {
      const element = response.data[j];
      const price = element.price;
      const timestamp = element.timestamp;
      const date = new Date(timestamp * 1000);
      const prices = {name:j,value:price}
      
      let hour = date.getHours();
        if (hour == 3) {
          algoItem.prices.push(prices);
        }
   }

  return algoItem;
}
}

export async function getASAPriceDataList(ids: any[]) {
  const algoItem = await getAlgoPrice();
  asaPriceListData.push(algoItem);
  const algoPrice = algoItem?.prices[algoItem.prices.length - 1].value

  // Construct the API URL with ID parameters
  for (let i = 0; i < ids.length; i++) {
  try {
    const assetLocal = asaList.find(x=> x.id === ids[i]);
    if (assetLocal?.amount == 0) {
      continue;
    }
    // Make an API request to fetch price data
    const apiUrl = 'https://free-api.vestige.fi/asset/';
  
    const fullApiUrl = `${apiUrl}${ids[i]}/prices/simple/7D`;
    const response = await axios.get(
      fullApiUrl
    );
    const iconUrl = `https://asa-list.tinyman.org/assets/${ids[i]}/icon.png`;
    if (response.data.length == 0) {
      continue;
    }
    const currentAmount = assetLocal?.amount ? assetLocal.amount : 0;
    const currentPrice = response.data[response.data.length - 1].price *  algoPrice;
    const usdBalans =  currentPrice * currentAmount;
    const algoBalans = usdBalans / algoPrice;
    const difference = response.data[response.data.length - 1].price -  response.data[0].price;
    const change = (difference / response.data[0].price) * 100 ;
    const isPositive = difference > 0 ? true : false;
    const priceFeedItem =  {id : ids[i], name:assetLocal?.name ,symbol:assetLocal?.code,icon:<CoinIcon urlAsset={iconUrl} alt={ ids[i]}/> ,balance:assetLocal?.amount.toFixed(2),logo:"any",usdBalance:usdBalans.toFixed(2),currentPrice: currentPrice.toFixed(4),algoBalance : algoBalans.toFixed(1) ,isChangePositive:isPositive,change:"%" + change.toFixed(1) ,color:"",prices:[{
      name:0,value: response.data[0].price
    }]}
      if (response.data.length > 0) {
        for (let j = 0; j < response.data.length; j++) {
          const element = response.data[j];
          const price = element.price;
          const timestamp = element.timestamp;
          const date = new Date(timestamp * 1000);
          const prices = {name:j,value:price}
          
          let hour = date.getHours();
            if (hour == 3) {
              priceFeedItem.prices.push(prices);
            }
       }
      
    }
   
    asaPriceListData.push(priceFeedItem);
   
  } catch (error) {
    console.error('Error fetching price data:', error);
    return []; // Return an empty array or handle the error as needed
  }
 } 
 const desiredIndex = asaPriceListData.findIndex(item => item.id === 1035899249);
 if (desiredIndex !== -1 && desiredIndex !== 1) {
  // Remove the object with the desired ID from the array
  const [desiredObject] = asaPriceListData.splice(desiredIndex, 1);

  // Insert the desired object as the second element
  asaPriceListData.splice(1, 0, desiredObject);
}
 return asaPriceListData;
}

// (async () => {
//   const idArray = [1, 2, 3]; // Replace with your array of ID numbers
//   const priceDataArray = await getASAPriceDataList(idArray);
//   console.log(priceDataArray);
//   console.log(priceDataArray);
// })();




export const priceFeedData = [
  {
    id: '0',
    name: 'Bitcoin',
    symbol: 'BTC',
    balance: '0.2231345',
    usdBalance: '11,032.24',
    logo: BitcoinImage,
    change: '+12.5%',
    isChangePositive: true,
    color: '#FDEDD4',
    icon: <Bitcoin />,
    prices: [
      { name: 1, value: 15187.44 },
      { name: 2, value: 21356.99 },
      { name: 3, value: 34698.98 },
      { name: 4, value: 37587.55 },
      { name: 5, value: 17577.4 },
      { name: 6, value: 26577.4 },
      { name: 7, value: 23577.4 },
      { name: 8, value: 18577.4 },
      { name: 9, value: 28577.4 },
    ],
  },
  {
    id: '1',
    name: 'Tether',
    symbol: 'USDT',
    balance: '1.2345',
    usdBalance: '1,032.24',
    logo: TetherImage,
    change: '-1.5%',
    isChangePositive: false,
    color: '#E1F9F1',
    icon: <Tether />,
    prices: [
      { name: 1, value: 12187.44 },
      { name: 2, value: 21356.99 },
      { name: 3, value: 37698.98 },
      { name: 4, value: 39587.55 },
      { name: 5, value: 29577.4 },
      { name: 6, value: 31577.4 },
      { name: 7, value: 47577.4 },
      { name: 8, value: 36577.4 },
      { name: 9, value: 28577.4 },
    ],
  },
  {
    id: '2',
    name: 'Cardano',
    symbol: 'ADA',
    balance: '1.2370',
    usdBalance: '532.94',
    logo: CardanoImage,
    change: '+12.5%',
    isChangePositive: true,
    color: '#DBE3FF',
    icon: <Cardano />,
    prices: [
      { name: 1, value: 25187.44 },
      { name: 2, value: 21356.99 },
      { name: 3, value: 34698.98 },
      { name: 4, value: 37587.55 },
      { name: 5, value: 17577.4 },
      { name: 6, value: 26577.4 },
      { name: 7, value: 23577.4 },
      { name: 8, value: 18577.4 },
      { name: 9, value: 28577.4 },
    ],
  },
  {
    id: '3',
    name: 'Binance',
    symbol: 'BUSD',
    balance: '240.55',
    usdBalance: '340.24',
    logo: BinanceImage,
    change: '+1.5%',
    isChangePositive: true,
    color: '#FBF5D5',
    icon: <Bnb />,
    prices: [
      { name: 1, value: 15187.44 },
      { name: 2, value: 16356.99 },
      { name: 3, value: 17698.98 },
      { name: 4, value: 37587.55 },
      { name: 5, value: 17577.4 },
      { name: 6, value: 20577.4 },
      { name: 7, value: 29577.4 },
      { name: 8, value: 33577.4 },
      { name: 9, value: 39577.4 },
    ],
  },
];
