import type { CoinTypes } from '@/types';
import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import cn from 'classnames';
import { ChevronDown } from '@/components/icons/chevron-down';
import { useClickAway } from '@/lib/hooks/use-click-away';
import { useLockBodyScroll } from '@/lib/hooks/use-lock-body-scroll';
import { asaList } from '@/data/static/coin-list';
// dynamic import
const CoinSelectView = dynamic(
  () => import('@/components/ui/coin-select-view')
);

interface CoinInputTypes extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  exchangeRate?: number;
  defaultCoinIndex?: number;
  className?: string;
  switchClicked : boolean;
  getCoinValue: (param: { coin: string; value: string , id:number }) => void;
  getCoinId : (param: { id: number; }) => void;
  setCoinValue?:number;
  onCoinError?: (message: string) => void;
}

const decimalPattern = /^[0-9]*[.,]?[0-9]*$/;

export default function CoinInput({
  label,
  getCoinValue,
  getCoinId,
  setCoinValue,
  switchClicked,
  defaultCoinIndex = 0,
  exchangeRate,
  className,
  onCoinError,
  ...rest
}: CoinInputTypes) {
  let [value, setValue] = useState('');
  let [selectedCoin, setSelectedCoin] = useState(asaList[defaultCoinIndex]);
  let [visibleCoinList, setVisibleCoinList] = useState(false);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  useClickAway(modalContainerRef, () => {
    setVisibleCoinList(false);
  });
  // useEffect(()=> {
  //   if (selectedCoin == null) {
  //     setSelectedCoin(asaList[defaultCoinIndex]);
  //   }
    
  // })
  useLockBodyScroll(visibleCoinList);
  const handleOnChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.value.match(decimalPattern)) {
      if (!selectedCoin) {
        if (onCoinError) onCoinError("Please select a coin before entering an amount.");
        return;
      }
      setValue(event.target.value);
      let param = { coin: selectedCoin.code, value: event.target.value , id: selectedCoin.id};
      getCoinValue && getCoinValue(param);
    }
  };
  function handleSelectedCoin(coin: CoinTypes) {
    if (coin != null) {
      setSelectedCoin(coin);
      setVisibleCoinList(false);
      let param = { id: coin.id};
      getCoinId && getCoinId(param);
    }
   
  }

  const handleOnClick = () => {
    setVisibleCoinList(true);

  };
  return (
    <>
      <div
        className={cn(
          'group flex min-h-[70px] rounded-lg border border-gray-200 transition-colors duration-200 hover:border-gray-900 dark:border-gray-700 dark:hover:border-gray-600',
          className
        )}
      >
        <div className="min-w-[80px] border-r border-gray-200 p-3 transition-colors duration-200 group-hover:border-gray-900 dark:border-gray-700 dark:group-hover:border-gray-600">
          <span className="mb-1.5 block text-xs uppercase text-gray-600 dark:text-gray-400">
            {label}
          </span>
          <button
            onClick={handleOnClick}
            
            className="flex items-center font-medium outline-none dark:text-gray-100"
          >
            {selectedCoin?.icon}{' '}
            <span className="ltr:ml-2 rtl:mr-2">{selectedCoin?.code} </span>
            <span className="ltr:ml-2 rtl:mr-2">{selectedCoin?.amount.toFixed(2)} </span>
            <ChevronDown className="ltr:ml-1.5 rtl:mr-1.5" />
          </button>
        </div>
        <div className="flex flex-1 flex-col text-right">
          <input
            type="text"
            value={value}
            placeholder="0.0"
            inputMode="decimal"
            onChange={handleOnChange}
            className="w-full rounded-tr-lg rounded-br-lg border-0 pb-0.5 text-right text-lg outline-none focus:ring-0 dark:bg-dark"
            {...rest}
          />
          {/* <span className="font-xs px-3 text-gray-400">
            = ${exchangeRate ? exchangeRate : '0.00'}
          </span> */}
        </div>
      </div>

      {visibleCoinList && (
        <div className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden bg-gray-700 bg-opacity-60 p-4 text-center backdrop-blur xs:p-5">
          {/* This element is to trick the browser into centering the modal contents. */}
          <span className="inline-block h-full align-middle" aria-hidden="true">
            &#8203;
          </span>
          <div
            ref={modalContainerRef}
            className="inline-block text-left align-middle"
          >
            <CoinSelectView
              onSelect={(selectedCoin) => handleSelectedCoin(selectedCoin)}
            />
          </div>
        </div>
      )}
    </>
  );
}

CoinInput.displayName = 'CoinInput';
