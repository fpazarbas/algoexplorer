import axios from 'axios';
import { microalgosToAlgos } from 'algosdk';
import { CoinTypes } from '@/types';
import { peraWallet } from '../dynamic/peraConnect';
import { List } from 'lodash';


type CoinIconProps = {
  urlAsset: string;
  alt : string;
};

const CoinIcon: React.FC<CoinIconProps> = ({ urlAsset,alt }) => {
  console.log(urlAsset);
  const imgElement = new Image();
  imgElement.src = urlAsset;

 
  return (
    <img
      src={urlAsset}
      alt= {alt}
      style={{ width: '24px', height: '24px' }}
    />
  );
};

export default CoinIcon;

export interface Coin  {
  id : number,
  icon: JSX.Element,
  code: string,
  name: string,
  amount: number,
  decimals : number,
  price : number
};

export const asaList : Coin[] = ([]); 

export async function getAsaList(): Promise<[Coin[] | null,Error | null]> {
  try {
    const account = peraWallet.connector?.accounts[0];
    if (!account) return [[], null];

    const response1 = await axios.get(`https://mainnet-api.algonode.cloud/v2/accounts/${account}`);
    const checkId = asaList.some(item => item.id === 0);
    const assets = response1.data.assets || [];
    
    if (!checkId) {
      const algoAmount = microalgosToAlgos(response1.data.amount);
      asaList.push({
          id : 0,
          icon : <CoinIcon urlAsset={"https://asa-list.tinyman.org/assets/0/icon.png"} alt={ "Algo"} />,
          code : "Algo",
          name : "Algorand",
          amount : algoAmount,
          decimals : 9,
          price :0
      });
    }

    // Fetch tinyman assets ONCE outside the loop to prevent massive network bottlenecks
    let tinyAssets: any = null;
    try {
      const tinyRes = await fetch('https://asa-list.tinyman.org/assets.json');
      tinyAssets = await tinyRes.json();
    } catch(e) {
      console.warn("Failed to fetch tinyman assets list");
    }

    // Fetch all asset details in parallel!
    const assetPromises = assets.map(async (asset: any) => {
      try {
        const response2 = await axios.get(`https://mainnet-api.algonode.cloud/v2/assets/${asset['asset-id']}`);
        const params = response2.data.params;
        const decimals = params.decimals;
        const code = params['unit-name'];
        const url = params.url;
        const name  = params.name;
        let amount = asset['amount'];
        
        if (decimals > 0) {
          amount = amount / Math.pow(10, decimals);
        }

        if (!url?.includes("ipfs:") && !url?.includes("https://tinyman.org")) {
          const checkId = asaList.some(item => item.id === asset['asset-id']);
          if (!checkId) {
            let urlass = `https://asa-list.tinyman.org/assets/${asset['asset-id']}/icon.png`;
            if (tinyAssets && !tinyAssets[asset['asset-id'].toString()]) {
              urlass = "https://algoexplorer.io/icons/no-icon.svg";
            }
            asaList.push({
              id : asset['asset-id'],
              icon : <CoinIcon urlAsset={urlass} alt={name || ""} />,
              code : code,
              name : name,
              amount : amount,
              decimals: decimals,
              price: 0
            });
          }
        }
      } catch (e) {
        console.warn("Failed to fetch asset", asset['asset-id']);
      }
    });

    await Promise.all(assetPromises);

    return [asaList,null];
  } catch (error) {
    console.error(error);
    return [null,error as Error];
  }
}







export const coinList  = [
   {
    id : 1,
    icon: <CoinIcon urlAsset={"https://asa-list.tinyman.org/assets/0/icon.png"} alt={ "Algo"} />,
    code: 'Algo',
    name: 'Algorand',
    amount: 0,
    decimals : 0,
    price : 0
  }
  
].filter(x=> x.id !== 1);

export async function getCoinList(address:string) {
  try {
    const response1 = await axios.get(
      'https://mainnet-api.algonode.cloud/v2/accounts/' + address
    );
    const assets = response1.data.assets;
    const algoAmount = microalgosToAlgos(response1.data.amount);
      coinList.push({
        id : 0,
        icon : <CoinIcon urlAsset={"https://asa-list.tinyman.org/assets/0/icon.png"} alt={ "Algo"} />,
        code : "Algo",
        name : "Algorand",
        amount : algoAmount,
        decimals : 9,
        price :0
      })
    for (const asset of assets) {
      const response2 = await axios.get(
        `https://mainnet-api.algonode.cloud/v2/assets/${asset['asset-id']}`
      );
      const decimals = response2.data.params.decimals;
      const code = response2.data.params['unit-name'];
      const url = response2.data.params.url;
      const name  = response2.data.params.name
      let amount = asset['amount'];
      if (decimals> 0) {
        let multiplier = 1;
        for (let i = 0; i < decimals; i++) {
          multiplier =  multiplier / 10;
        }
        amount = amount * multiplier;
      }
      console.log(amount);
     

      if (!url?.includes("ipfs:")) {
        if (!url?.includes("https://tinyman.org")) {
         const checkId = coinList.some(item => item.id === asset['asset-id'])
         let url = "https://asa-list.tinyman.org/assets/" + asset['asset-id'] + "/icon.png"
          coinList.push({
            id : asset['asset-id'],
            icon : <CoinIcon urlAsset={url} alt={''}/>,
            code : code,
            name : name,
            amount : amount,
            decimals:decimals,
            price:0
           })
         
        }
      }
    }

    
  } catch (error) {
    console.error(error);
  }
}


