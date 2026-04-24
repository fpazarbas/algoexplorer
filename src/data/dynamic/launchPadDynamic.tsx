import algosdk, { Account, microalgosToAlgos } from "algosdk";
import { peraWallet } from "./peraConnect";
import { detectKcInWallet } from "./commonAlgoUtils";


export const algodClient = new algosdk.Algodv2(
    "",
    "https://mainnet-api.algonode.cloud/",
    ""
  );

  export async function  createAsset (total:number,decimals:number,creator:string,manager:string,reserve:string,freeze:string,clawback:string,assetUrl:string,frozen:boolean=false,unitname:string,assetname:string):Promise<[string | null,Error | null]>{
     const response = await detectKcInWallet()
     const kcCheck = response[0];
     const kcCheckError = response[1];
     
     if (kcCheck) {
        try {
          const suggestedParams = await algodClient.getTransactionParams().do();
          const txn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
            from: creator,
            suggestedParams,
            defaultFrozen: frozen,
            unitName: unitname,
            assetName: assetname,
            manager: manager,
            reserve: reserve,
            freeze: freeze,
            clawback: clawback,
            assetURL: assetUrl,
            total: total,
            decimals: decimals,
          });
          const singleTxnGroups = [{txn: txn, signers: [creator]}];
          const signedTxn = await peraWallet.signTransaction([singleTxnGroups])
          await algodClient.sendRawTransaction(signedTxn).do();
          const result = await algosdk.waitForConfirmation(
          algodClient,
          txn.txID().toString(),
          3
          );
      
          const assetIndex = result['asset-index'];
          console.log(`Asset ID created: ${assetIndex}`);
          return [assetIndex,null];
        } catch (error) {
          console.log("Couldn't sign Opt-in txns", error);
          return [null,error as Error];
        }
        
     }else{
        return [null,kcCheckError]
     }
  }


//   export async function  createAsset (address){
//     let response = await detectKcInWallet()
    
//     if (response[0]) {
//        const suggestedParams = await algodClient.getTransactionParams().do();
//        const txn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject({
//          from: '4C2N6434353PZPCDCUIIMXO535TFNQTFQ6QESZZS2WGFIPNONFAPZFM6CQ',
//          suggestedParams,
//          defaultFrozen: false,
//          unitName: 'MDS',
//          assetName: 'MIDAS',
//          manager: '4C2N6434353PZPCDCUIIMXO535TFNQTFQ6QESZZS2WGFIPNONFAPZFM6CQ',
//          reserve: '4C2N6434353PZPCDCUIIMXO535TFNQTFQ6QESZZS2WGFIPNONFAPZFM6CQ',
//          freeze: '4C2N6434353PZPCDCUIIMXO535TFNQTFQ6QESZZS2WGFIPNONFAPZFM6CQ',
//          clawback: '4C2N6434353PZPCDCUIIMXO535TFNQTFQ6QESZZS2WGFIPNONFAPZFM6CQ',
//          assetURL: '',
//          total: 10000000,
//          decimals: 0,
//        });
     
//        try {
//          const singleTxnGroups = [{txn: txn, signers: ['4C2N6434353PZPCDCUIIMXO535TFNQTFQ6QESZZS2WGFIPNONFAPZFM6CQ']}];
//          const signedTxn = await peraWallet.signTransaction([singleTxnGroups])
//          await algodClient.sendRawTransaction(signedTxn).do();
//          const result = await algosdk.waitForConfirmation(
//          algodClient,
//          txn.txID().toString(),
//          3
//          );
     
//          const assetIndex = result['asset-index'];
//          console.log(`Asset ID created: ${assetIndex}`);
        
//        } catch (error) {
//          console.log("Couldn't sign Opt-in txns", error);
//        }
       
//     }
//  }