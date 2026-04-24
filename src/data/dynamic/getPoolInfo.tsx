import { SignerTransaction, SupportedNetwork, Swap, SwapQuote, SwapType, V2PoolInfo, poolUtils } from "@tinymanorg/tinyman-js-sdk";
import { AssetWithIdAndDecimals } from "@tinymanorg/tinyman-js-sdk/dist/util/asset/assetModels";
import algosdk, { Account, microalgosToAlgos } from "algosdk";
import { peraWallet } from "./peraConnect";
import { DirectSwapQuoteAndPool } from "@tinymanorg/tinyman-js-sdk/dist/swap/types";
import { asaList } from "../static/coin-list";
import { detectKcInWallet } from "./commonAlgoUtils";


export const algodClient = new algosdk.Algodv2(
    "",
    "https://mainnet-api.algonode.cloud/",
    ""
  );
export async function getPoolInfo(asset1Id : number , asset2Id: number): Promise<V2PoolInfo> {     
   return await poolUtils.v2.getPoolInfo({client:algodClient, asset1ID:asset1Id,asset2ID:asset2Id,network:"mainnet"as SupportedNetwork})
}

export async function getQuotes( assetInId : number , assetOutId : number , amount:number): Promise<[SwapQuote | null,Error | null]> {
  
      const assetIn:AssetWithIdAndDecimals = {
      id: assetInId,
      decimals: 6
    };
    const assetOut :AssetWithIdAndDecimals = {
      id: assetOutId,
      decimals: 12
    };  

  const pool = await getPoolInfo(assetInId,assetOutId);
try {
  const fixedInputSwapQuote = await Swap.v2.getQuote({type:SwapType.FixedInput,assetIn:assetIn ,assetOut:assetOut,pool:pool,network:"mainnet" as SupportedNetwork,amount:amount})
  const data = fixedInputSwapQuote.data as DirectSwapQuoteAndPool;

  console.log(data.quote.assetOutAmount);
  const  algos = microalgosToAlgos(Number(data.quote.assetOutAmount));
  console.log(algos);
  return [fixedInputSwapQuote,null];
} catch (error) {
  return [null,error as Error];
}
  
  
}




export async function swap(initiatorAddr : string | null, assetInId : number , assetOutId : number , amount:number) : Promise<[string | null,Error | null]>{
  

  const response = await detectKcInWallet()
  const kcCheckError = response[1];
  
  if (kcCheckError != null && assetOutId != 1035899249) {
    return [null, kcCheckError];
  }

  const assetIn:AssetWithIdAndDecimals = {
  id: assetInId,
  decimals: 6
};
const assetOut :AssetWithIdAndDecimals = {
  id: assetOutId,
  decimals: 12
};  

const pool = await getPoolInfo(assetInId,assetOutId);

const fixedInputSwapQuote = await Swap.v2.getQuote({type:SwapType.FixedInput,assetIn:assetIn ,assetOut:assetOut,pool:pool,network:"mainnet" as SupportedNetwork,amount:amount})
const data = fixedInputSwapQuote.data as DirectSwapQuoteAndPool;
console.log(data.quote.assetOutAmount);
const  algos = microalgosToAlgos(Number(data.quote.assetOutAmount));
console.log(algos);

if (initiatorAddr != null) {
  try {

     const fixedInputSwapTxns = await Swap.v2.generateTxns({
      client: algodClient,
      network: "mainnet" as SupportedNetwork,
      quote : fixedInputSwapQuote,
      swapType : SwapType.FixedInput,
      slippage: 0.05,
      initiatorAddr : initiatorAddr
    });
   
    if (fixedInputSwapTxns != null) {
     const singedTx = await peraWallet.signTransaction([fixedInputSwapTxns]);
     const swapExecutionResponse = await Swap.v2.execute({
      client: algodClient,
      quote : fixedInputSwapQuote,
      signedTxns: singedTx,
      txGroup: fixedInputSwapTxns,
    });
    if (swapExecutionResponse.txnID != null) {
      return [swapExecutionResponse.txnID,null];
    } 
    throw new Error("Something went wrong please try again.");
    
  }
    //throw new Error("Success..");
  } catch (error) {
    console.log("Couldn't sign Opt-in txns", error);
    return [null,error as Error]
  }
}
const error = new Error("Wallet adress not found.");
return [null,error as Error]
}






export async function signerWithSecretKey(account: Account) {
  return function (txGroups: SignerTransaction[][]): Promise<Uint8Array[]> {
    // Filter out transactions that don't need to be signed by the account
    const txnsToBeSigned = txGroups.flatMap((txGroup) =>
      txGroup.filter((item) => item.signers?.includes(account.addr))
    );


 
    // Sign all transactions that need to be signed by the account
    const signedTxns: Uint8Array[] = txnsToBeSigned.map(({ txn }) =>
      txn.signTxn(account.sk)
    );

 
    // We wrap this with a Promise since SDK's initiatorSigner expects a Promise
    return new Promise((resolve) => {
      resolve(signedTxns);
    });
  };
}

async function generateAssetTransferTxns({
  to,
  assetID,
  initiatorAddr,
  amount,
  algod,
}: {
  to: string;
  assetID: number;
  initiatorAddr: string;
  amount : number;
  algod: algosdk.Algodv2
}) {
  const suggestedParams = await algod.getTransactionParams().do();
  suggestedParams.fee = 0;   
 

 // const senderAccountInfo = await algodClient.accountInformation(initiatorAddr).do();

const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
  from: initiatorAddr,
  to,
  amount: amount,
  suggestedParams
});
  

  return [{txn, signers: [initiatorAddr]}];
}

export async function optInKC(): Promise<[string | null,Error | null]> {
  try {
    const account = await peraWallet.connector?.accounts[0] ? peraWallet.connector?.accounts[0] : "";
    if (account != null) {
      let assetIndex = 1035899249;

      const suggestedParams = await algodClient.getTransactionParams().do();
      const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: account,
        to: account,
        assetIndex: assetIndex,
        amount: 0,
        suggestedParams
      });
     const singleTxnGroups = [{txn: optInTxn, signers: [account]}];
     const signedTxn = await peraWallet.signTransaction([singleTxnGroups]);
     const {txId} = await algodClient.sendRawTransaction(signedTxn).do();
      //await algosdk.waitForConfirmation(algodClient, optInTxn.txID().toString(), 3);
      return ["$KC successfully opt-in..",null]
    }
    const  accountError = new Error("Account not found.")
    return [null,accountError]
  } catch (error) {
    return [null,error as Error]
  }
 
}

// async function generateOptIntoAssetTxns({
//   assetID,
//   initiatorAddr
// }: {
//   assetID: number;
//   initiatorAddr: string;
// }): Promise<SignerTransaction[]> {
//   const suggestedParams = await algodClient.getTransactionParams().do();
//   const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
//     from: initiatorAddr,
//     to: initiatorAddr,
//     assetIndex: assetID,
//     amount: 0,
//     suggestedParams
//   });
// ​
//   return [{txn: optInTxn, signers: [initiatorAddr]}];
// }



    // _______ fee code _________
    //const txGroups = await generateAssetTransferTxns({
//   to: "PRF3CURVYL2FXI4Y57XJVLHAEBQVSKQQO7X4RJYA3GW7MGYWFGML3EIVFE",
//   assetID: 0,
//   initiatorAddr: initiatorAddr,
//   amount : 30000,
//   algod:algodClient
// });
    // const signedTxn = await peraWallet.signTransaction([txGroups]);
    // const {txId} = await algodClient.sendRawTransaction(signedTxn).do();
     // _______ fee code _________