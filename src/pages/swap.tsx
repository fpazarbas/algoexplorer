import { useEffect, useReducer } from 'react';
import type { NextPageWithLayout } from '@/types';
import cn from 'classnames';
import { NextSeo } from 'next-seo';
import Button from '@/components/ui/button';
import CoinInput from '@/components/ui/coin-input';
import TransactionInfo from '@/components/ui/transaction-info';
import Trade from '@/components/ui/trade';
import RootLayout from '@/layouts/_root-layout';
import { getQuotes, optInKC, swap } from '@/data/dynamic/getPoolInfo';
import { Coin, getAsaList, asaList} from '@/data/static/coin-list';
import algosdk, {algosToMicroalgos, microalgosToAlgos } from "algosdk";
import { peraWallet } from '@/data/dynamic/peraConnect';
import ErrorPopup from '@/components/ui/error-popup';
import { debounce } from 'lodash';
import { useCallback } from 'react';
import { DirectSwapQuoteAndPool } from '@tinymanorg/tinyman-js-sdk/dist/swap/types';
import RadioButtonGroup from '@/components/ui/button/radiobutton';
import { ExchangeIcon } from '@/components/icons/exchange';
import { detectKcInWallet } from '@/data/dynamic/commonAlgoUtils';



const SwapPage: NextPageWithLayout = () => {
  
  const initialState = {
    toggleCoin: false,
    assetOutQuote: 0,
    errorPopup: { isOpen: false, message: '' },
    fromCoinId: -1,
    toCoinId: -1,
    fromIndex: -1,
    toIndex: -1,
    priceLabel: 0.0,
    priceImpact: 0.0,
    rate: 0.0,
    sliparage: 0.0,
    swapFee: 0.0,
    tinyError: '',
    fromValue: '',
    maxValue: '',
    account: null as string | null,
    swapAmount: 0.0,
    asaListInWallet: null as Coin[] | null,
    switchClicked: false,
    valueToSwap: 0,
    tinySuccess: '',
    isLoading: false,
    isKCOptedIN: true
  };

  const [state, updateState] = useReducer((prev: any, next: any) => ({ ...prev, ...next }), initialState);
  const { toggleCoin, assetOutQuote, errorPopup, fromCoinId, toCoinId, fromIndex, toIndex, priceLabel, priceImpact, rate, sliparage, swapFee, tinyError, fromValue, maxValue, account, swapAmount, asaListInWallet, switchClicked, valueToSwap, tinySuccess, isLoading, isKCOptedIN } = state;



  useEffect(()=> {
    async function getAsas() {
      updateState({ account: peraWallet.connector ? peraWallet.connector.accounts[0] : null });
      let asaInWallet =  await getAsaList();
      const kcOpted = await detectKcInWallet();
      const kcOptedSuccess = kcOpted[0];
      if (kcOptedSuccess) {
        updateState({ isKCOptedIN: true });
      }else{
        updateState({ isKCOptedIN: false });
      }
      if (asaInWallet[0] != null && asaInWallet[0].length > 0) {
        updateState({ asaListInWallet: asaInWallet[0] }) 
        const getQuote = await getQuotes(asaInWallet[0][0].id,asaInWallet[0][1].id,1000) 
        if (getQuote[0]!= null) {
                  const data = getQuote[0].data as DirectSwapQuoteAndPool;
                  const amount =  data.quote.assetOutAmount as any;
                  updateState({ assetOutQuote: amount });
                  if (toCoinId == -1) {
                    updateState({ toCoinId: asaInWallet[0][1].id });  
                    updateState({ toIndex: 1 });
                  }
                  if (fromCoinId == -1) {
                    updateState({ fromCoinId: asaInWallet[0][0].id });
                   
                    updateState({ fromIndex: 0 }); 
                  }
                       
                }else{
                  if (getQuote[1]!= null) {
                    updateState({ tinyError: getQuote[1].message });
                  }
                }
       }
      else {
        // PeraWallet connection is now exclusively handled globally by the Header (PeraConnect).
        // No redundant reconnectSession here to prevent race conditions.
        if (peraWallet.isConnected && peraWallet.connector?.accounts.length) {
          const accounts = peraWallet.connector.accounts;
          let asaRetry = await getAsaList();
          updateState({ asaListInWallet: asaRetry[0] });
          updateState({ account: accounts[0] });
          if (asaRetry[0] != null) {
            const getQuote = await getQuotes(asaRetry[0][0].id,asaRetry[0][1].id,1000)
            const data = getQuote[0]?.data as DirectSwapQuoteAndPool;
            const amount =  data.quote.assetOutAmount as any;
            updateState({ assetOutQuote: amount });
            updateState({ toCoinId: asaRetry[0][0].id });
            updateState({ fromCoinId: asaRetry[0][1].id });
          }
        }
      }
    }

    getAsas();
  }, [])

  

const adjustSellerMultipliers = (coinId : number) => {
  const coin = asaList.find(x => x.id == coinId);
  if (coin != null && coin.decimals > 0) {
    return Math.pow(10, coin.decimals);
  }
  return 1;
}


const adjustPriceMultiplier = (coinId : number) => {
  const coin = asaList.find(x => x.id == coinId);
  if (coin != null && coin.decimals !== undefined && coin.decimals > 0) {
    return Math.pow(10, -coin.decimals);
  }
  return 1;
}

  const fetchQuotesDebounced = useCallback(
    debounce(async (fId, tId, amt, pMult, fDecPts) => {
       const getQuote = await getQuotes(fId,tId,amt);
       if (getQuote[0] != null) {
        updateState({ tinyError: "" });
        const data = getQuote[0].data as DirectSwapQuoteAndPool;
        let price = Number(data.quote.assetOutAmount) * pMult;
        let swapFee = Number(data.quote.swapFee);
        if (tId == 0) {
          price = microalgosToAlgos(Number(data.quote.assetOutAmount));
          let fromDecimalMultiplier = 1;
          if (fDecPts !== undefined && fDecPts > 0) {
           for (let i = 0; i < fDecPts; i++) {
             fromDecimalMultiplier =  fromDecimalMultiplier / 10;
           }
          }
          swapFee = Number(data.quote.swapFee) * fromDecimalMultiplier;
        }
        if(fId == 0){
          swapFee = microalgosToAlgos(Number(data.quote.swapFee));
        }
       
        updateState({ priceImpact: data.quote.priceImpact * 100 });
        updateState({ swapFee: swapFee * 2 });
        updateState({ priceLabel: price });
       }
       else{
        if (getQuote[1] != null) {
          updateState({ tinyError: getQuote[1].message });
        }
       }
    }, 500),
    []
  );

  const handleFromChange = async (param:any) => {
     updateState({ priceLabel: 0.0 });
     updateState({ fromCoinId: param.id });
     updateState({ fromValue: param.value })
     console.log('From coin id :', param.id);
     console.log('to id :', toCoinId);
     console.log('from id :', fromCoinId);

     const coin =  asaList.find(x=> x.id == param.id);
     const value = Number(param.value);
     const decimals =  coin?.decimals ? coin.decimals : 0;
     if (coin != null) {
      let amount = value ;
      if (param.id == 0) {
        amount = algosToMicroalgos(value);
      }else{
          let multiplier = adjustSellerMultipliers(coin.id);
          amount = amount * multiplier;
        
      }
       const fromDecimalsPoints = asaList.find(x=> x.id == fromCoinId)?.decimals ? asaList.find(x=> x.id == fromCoinId)?.decimals : 0;
       let priceMultiplier = adjustPriceMultiplier(toCoinId);
       console.log('From coin value :', param.value);
       console.log('From coin amount :', amount);
       updateState({ swapAmount: amount });
       fetchQuotesDebounced(fromCoinId, toCoinId, amount, priceMultiplier, fromDecimalsPoints);
     }
  };

  const handleToChange = (id:number) => {
    console.log('To coin id :', id);
    updateState({ toCoinId: id });
 };

 const handleSwitchFrom = () => {
    updateState({ toIndex: fromIndex });
    updateState({ fromIndex: toIndex });
    updateState({ switchClicked: true });
    updateState({ fromValue: '' });
    updateState({ priceLabel: 0.0 });
 };

 const deleteVal = () => {
   updateState({ fromValue: '' });
   updateState({ priceLabel: 0.0 });
   updateState({ swapFee: 0.0 });
   updateState({ priceImpact: 0.0 });
 }

const handleSelectedValueChange = async (selectedValue: number) => {
      const fromCoin = asaListInWallet?.find((x: any)=> x.id == fromCoinId) ;
      if (fromCoin != null) {
        let multiplier = 1;
        let selectedVal = 0
        
        if (fromCoin.id === 0) {
          selectedVal = algosToMicroalgos(fromCoin.amount * selectedValue);
        }else { 
          multiplier = adjustSellerMultipliers(fromCoin.id);
          selectedVal = Math.round(fromCoin.amount * selectedValue * multiplier);
      }
        let amountLabel = selectedValue * fromCoin.amount;
        updateState({ fromValue: amountLabel.toFixed(fromCoin.decimals).toLocaleString() });
        updateState({ swapAmount: selectedVal });
        const getQuote = await getQuotes(fromCoinId,toCoinId,selectedVal);
       if (getQuote[0] != null) {
        updateState({ tinyError: "" });
        const data = getQuote[0].data as DirectSwapQuoteAndPool;
        let priceMultiplier = adjustPriceMultiplier(toCoinId);
        let price = Number(data.quote.assetOutAmount) * priceMultiplier;
        let swapFee = Number(data.quote.swapFee);
        if (toCoinId == 0) {
          price = microalgosToAlgos(Number(data.quote.assetOutAmount));
          let fromDecimalMultiplier = 1;
          if (fromCoin.decimals !== undefined && fromCoin.decimals > 0) {
        
           for (let i = 0; i < fromCoin.decimals; i++) {
             fromDecimalMultiplier =  fromDecimalMultiplier / 10;
           }
          
        }
          swapFee = Number(data.quote.swapFee) * fromDecimalMultiplier;
          
        }
        if(fromCoinId == 0){
          swapFee = microalgosToAlgos(Number(data.quote.swapFee));
        }
        console.log('Price Impact :', data.quote.priceImpact);
        updateState({ priceImpact: data.quote.priceImpact * 100 });
        updateState({ swapFee: swapFee });
        console.log('quote is ', price);
        updateState({ priceLabel: price });
       }
       else{
        if (getQuote[1] != null) {
          updateState({ tinyError: getQuote[1].message });
        }
       }
      }else{
        return;
      }
      console.log('Selected Value:', selectedValue);
 };


const handleSwap = async () => {
  updateState({ isLoading: true });
    try {
    let response =  await swap(account,fromCoinId,toCoinId,swapAmount);
    let swapError = response[1];
    let swapSucceed = response[0];
    if (swapError) {
       updateState({ tinyError: swapError.message });
       updateState({ isLoading: false });
       return;
    }

    if (swapSucceed) {
      updateState({ tinySuccess: "Transaction completed with txnID: " + swapSucceed });
      updateState({ isLoading: false });
      return;
    }

  } catch (error) {
    const err = error as Error;
    updateState({ tinyError: err.message });
    updateState({ isLoading: false });
  }
  
}

const handleOptIn = async () => {
   updateState({ isLoading: true });
   const response =  await optInKC()
   const optInSucceed = response[0];
   const optInError = response[1];
   if (optInSucceed != null) {
    updateState({ tinySuccess: optInSucceed })
   }else if(optInError != null){
    updateState({ tinyError: optInError.message })
   }
   updateState({ isLoading: false });
}

const btnOptInStyle = {
  backgroundColor:'#EA3C12',
  display: isKCOptedIN ? 'none' : 'block'
};


    

  return (
    <>
      <NextSeo
        title="Swap"
        description="KOC - Algorand | Defi | Launcpad"
      />
      <Trade>
        <div className="mb-5 border-b border-dashed border-gray-200 pb-5 dark:border-gray-800 xs:mb-7 xs:pb-6 color:white">
          <div
            className={cn(
              'relative flex gap-3',
              toggleCoin ? 'flex-col-reverse' : 'flex-col'
            )}
          >
         
            <CoinInput
              label={'From'}
              exchangeRate={0.0}
              defaultCoinIndex={fromIndex}
              switchClicked =  {switchClicked}
              getCoinId={(data)=> updateState({ fromCoinId: data.id })}
              getCoinValue={(data) => handleFromChange(data)}
              onClick={deleteVal}
              value={fromValue}
              onCoinError={(msg) => updateState({ errorPopup: { isOpen: true, message: msg } })}
            />
            <div className='flex gap-2'>
            {/* <button  onClick={handleSwitchFrom}><ExchangeIcon style={{ transform: 'rotate(90deg)' }} width="24px" height="24px"></ExchangeIcon></button> */}
            <RadioButtonGroup  onSelectedValueChange={handleSelectedValueChange} />
            </div>
           
            <CoinInput
              label={'To'}
              exchangeRate={0.0}
              switchClicked =  {switchClicked}
              defaultCoinIndex={toIndex}
              getCoinId={(data)=> updateState({ toCoinId: data.id })}
              getCoinValue={(data) => handleToChange(data.id)}
              value = {priceLabel.toFixed(2)}   
              onCoinError={(msg) => updateState({ errorPopup: { isOpen: true, message: msg } })}
            />
             
          </div>
          <Button
          size="large"
          shape="rounded"
          style={{backgroundColor:'#EA3C12'}}
          fullWidth={true}
          isLoading={isLoading}
          className="mt-6 uppercase xs:mt-8 xs:tracking-widest"
          onClick={handleSwap}
        >
          SWAP 
        </Button>
        <Button
          size="large"
          shape="rounded"
          style={{display: isKCOptedIN ? 'none' : 'block' ,  backgroundColor:'#EA3C12'}}
          fullWidth={true}
          isLoading={isLoading}
          className="mt-6 uppercase xs:mt-8 xs:tracking-widest gap-3"
          onClick={handleOptIn}
        >
          Opt-In 
        </Button>
       
        </div>
        <div className="flex flex-col gap-1 xs:gap-[12px]">
          <TransactionInfo label={'Price Impact'} value={priceImpact.toFixed(2) + "%"}/>
          <TransactionInfo label={'Swap Fee'} value={swapFee.toFixed(2)}/>
           <p className='font-medium' style={{color:'red'}}> {tinyError}</p>
           <p className='font-medium' style={{color:'green'}}> {tinySuccess}</p>
        </div>
       
      </Trade>
      <ErrorPopup 
        isOpen={errorPopup.isOpen} 
        message={errorPopup.message} 
        onClose={() => updateState({ errorPopup: { isOpen: false, message: '' } })} 
      />
    </>
  );
};

SwapPage.getLayout = function getLayout(page) {
  return <RootLayout>{page}</RootLayout>;
};

export default SwapPage;
