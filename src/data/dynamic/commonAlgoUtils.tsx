import { SignerTransaction, SupportedNetwork, Swap, SwapQuote, SwapType, V2PoolInfo, poolUtils } from "@tinymanorg/tinyman-js-sdk";
import { AssetWithIdAndDecimals } from "@tinymanorg/tinyman-js-sdk/dist/util/asset/assetModels";
import algosdk, { Account, microalgosToAlgos } from "algosdk";
import { peraWallet } from "./peraConnect";
import { DirectSwapQuoteAndPool } from "@tinymanorg/tinyman-js-sdk/dist/swap/types";
import { Coin, asaList, getAsaList } from "../static/coin-list";
import { error } from "console";


export const algodClient = new algosdk.Algodv2(
    "",
    "https://mainnet-api.algonode.cloud/",
    ""
  );


  export   async function  detectKcInWallet() :Promise<[Boolean ,Error | null]>{
   try {
    let coins =  await getAsaList();
    if (coins[0] != null) {
    let findKC = coins[0].find(x=> x.id == 1035899249);
    if (findKC != null) {
       if (findKC.amount < 5) {
       //not enought kc
           const err =  new Error("There are no extra fees in the platform but ,you must have 5 $KC n your wallet to continue.")
           return [false, err]
       }
       //success
       return [true,null];
    }else{
      //not opt-in
     const err =  new Error("There are no extra fees in the platform but ,you must have 5 $KC in your wallet to continue.")
     return [false, err]
    }
}
} catch (error) {
        return [false,error as Error]
    }
    return [false, null]
}
