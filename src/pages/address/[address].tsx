import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import type { NextPageWithLayout } from '@/types';
import { NextSeo } from 'next-seo';
import RootLayout from '@/layouts/_root-layout';
import axios from 'axios';
import { format } from 'date-fns';
import Link from 'next/link';

const getTxTypeLabel = (type: string) => {
  switch (type) {
    case 'pay': return 'Payment';
    case 'axfer': return 'Asset Transfer';
    case 'appl': return 'Application Call';
    case 'acfg': return 'Asset Config';
    case 'afrz': return 'Asset Freeze';
    case 'keyreg': return 'Key Registration';
    default: return type ? type.toUpperCase() : 'UNKNOWN';
  }
};

const getTxTokenInfo = (tx: any, assetCache: Record<number, { name: string, decimals: number }>) => {
  if (tx['tx-type'] === 'pay') {
    return { amount: ((tx['payment-transaction']?.amount || 0) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 4 }), token: 'Algo', assetId: 0 };
  } else if (tx['tx-type'] === 'axfer') {
    const assetId = tx['asset-transfer-transaction']?.['asset-id'];
    const cached = assetCache[assetId];
    if (cached) {
      const amount = tx['asset-transfer-transaction']?.amount || 0;
      const formatted = cached.decimals > 0 ? (amount / Math.pow(10, cached.decimals)).toLocaleString(undefined, { maximumFractionDigits: cached.decimals }) : amount.toLocaleString();
      return { amount: formatted, token: cached.name, assetId };
    }
    return { amount: (tx['asset-transfer-transaction']?.amount || 0).toLocaleString(), token: `ASA ${assetId}`, assetId };
  } else if (tx['tx-type'] === 'appl') {
    return { amount: 0, token: 'App Call', assetId: 0 };
  }
  return { amount: 0, token: tx['tx-type'] ? tx['tx-type'].toUpperCase() : 'Tx', assetId: 0 };
};

const AddressDetailPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { address } = router.query;
  const isReady = router.isReady;
  
  const [account, setAccount] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nfdName, setNfdName] = useState<string | null>(null);
  const [assetCache, setAssetCache] = useState<Record<number, { name: string, decimals: number }>>({});

  useEffect(() => {
    if (!isReady || !address || typeof address !== 'string') return;
    
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        // Fetch Account Info
        const accRes = await axios.get(`https://mainnet-idx.algonode.cloud/v2/accounts/${address}`);
        setAccount(accRes.data.account);
        
        // Fetch Transactions
        const txRes = await axios.get(`https://mainnet-idx.algonode.cloud/v2/accounts/${address}/transactions?limit=20`);
        const txs = txRes.data.transactions || [];
        setTransactions(txs);

        // Fetch NFD
        axios.get(`https://api.nf.domains/nfd/lookup?address=${address}`)
          .then(res => {
             if (res.data[address] && res.data[address].name) {
                setNfdName(res.data[address].name);
             }
          }).catch(() => {});

        // Build Asset Cache for TXs and Balances
        const assetIds = new Set<number>();
        
        // Collect from balances
        if (accRes.data.account.assets) {
           accRes.data.account.assets.forEach((a: any) => {
              if (a.amount > 0) assetIds.add(a['asset-id']);
           });
        }
        
        // Collect from txs
        txs.forEach((tx: any) => {
           if (tx['tx-type'] === 'axfer') {
              const aid = tx['asset-transfer-transaction']?.['asset-id'];
              if (aid) assetIds.add(aid);
           }
        });

        // Fetch unknown assets
        const newCache: Record<number, {name: string, decimals: number}> = {};
        const promises = Array.from(assetIds).map(aid => 
           axios.get(`https://mainnet-idx.algonode.cloud/v2/assets/${aid}`).then(res => {
              const params = res.data?.asset?.params;
              if (params) {
                 newCache[aid] = {
                    name: params['unit-name'] || params.name || `ASA ${aid}`,
                    decimals: params.decimals || 0
                 };
              }
           }).catch(() => {})
        );
        
        Promise.all(promises).then(() => {
           setAssetCache(newCache);
        });
        
      } catch (err: any) {
        setError(err.response?.data?.message || 'Account not found.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [address, isReady]);

  const safeAddress = typeof address === 'string' ? address : '';

  return (
    <div className="bg-[#f8f9fa] dark:bg-dark min-h-[calc(100vh-140px)] -mt-4 -mx-4 sm:-mx-6 lg:-mx-8">
      <NextSeo 
        title={nfdName ? `${nfdName} - euro.algo Explorer` : (safeAddress ? `Address ${safeAddress.slice(0,8)}...` : 'Account Details')} 
        description="Algorand Account Details" 
      />
      
      <div className="mx-auto max-w-[1200px] w-full p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex items-center gap-4">
           <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 p-2 rounded-sm shadow-sm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
           </button>
           <h1 className="text-2xl font-light text-gray-800 dark:text-white">Account Details</h1>
        </div>

        {loading && (
           <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 p-8 shadow-sm rounded-sm text-center text-gray-500">
              Loading account...
           </div>
        )}

        {error && !loading && (
           <div className="bg-white dark:bg-[#111827] border border-red-200 dark:border-red-900/30 p-8 shadow-sm rounded-sm text-center text-red-500">
              {error}
           </div>
        )}

        {account && !loading && (
          <div className="space-y-6">
             {/* Header Card */}
             <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 shadow-sm rounded-sm overflow-hidden p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                   <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Address</div>
                   <div className="text-lg md:text-xl font-mono text-gray-800 dark:text-white break-all">{account.address}</div>
                   {nfdName && (
                      <div className="text-[#1b72e8] font-semibold mt-1 flex items-center gap-2">
                         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                         {nfdName}
                      </div>
                   )}
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-sm border border-blue-100 dark:border-blue-900/50 min-w-[200px] text-center md:text-right">
                   <div className="text-[11px] text-[#1b72e8] dark:text-blue-400 font-semibold uppercase tracking-wider mb-1">ALGO Balance</div>
                   <div className="text-2xl font-bold text-gray-900 dark:text-white">₳ {((account.amount || 0) / 1e6).toLocaleString(undefined, {maximumFractionDigits: 6})}</div>
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Col: ASA Balances */}
                <div className="lg:col-span-1">
                   <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Asset Balances</h2>
                   <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 shadow-sm rounded-sm max-h-[600px] overflow-y-auto">
                      {account.assets && account.assets.filter((a: any) => a.amount > 0).length > 0 ? (
                         account.assets.filter((a: any) => a.amount > 0).map((a: any) => {
                            const cached = assetCache[a['asset-id']];
                            const name = cached ? cached.name : `ASA ${a['asset-id']}`;
                            const amount = cached && cached.decimals > 0 ? (a.amount / Math.pow(10, cached.decimals)).toLocaleString(undefined, { maximumFractionDigits: cached.decimals }) : a.amount.toLocaleString();
                            return (
                               <div key={a['asset-id']} className="flex justify-between items-center p-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                  <Link href={`/asset/${a['asset-id']}`} className="text-[#1b72e8] hover:underline flex items-center gap-2">
                                     <img src={`https://asa-list.tinyman.org/assets/${a['asset-id']}/icon.png`} alt="" className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" onError={(e) => e.currentTarget.style.display = 'none'} />
                                     {name}
                                  </Link>
                                  <span className="text-gray-800 dark:text-gray-200 font-medium">{amount}</span>
                               </div>
                            );
                         })
                      ) : (
                         <div className="p-6 text-center text-gray-500 text-sm">No assets found.</div>
                      )}
                   </div>
                </div>

                {/* Right Col: Transactions */}
                <div className="lg:col-span-2">
                   <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Recent Transactions</h2>
                   <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 shadow-sm rounded-sm max-h-[600px] overflow-y-auto">
                      {transactions.length > 0 ? transactions.map((tx: any, i: number) => (
                         <div key={tx.id || i} className="flex items-center p-4 py-4 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors relative">
                            {/* Left sideways label */}
                            <div className="absolute left-0 top-0 bottom-0 w-8 border-r border-gray-100 dark:border-gray-800 flex items-center justify-center">
                              <span className="text-[9px] text-gray-400 uppercase tracking-widest transform -rotate-90 origin-center whitespace-nowrap w-20 text-center">{getTxTypeLabel(tx['tx-type'])}</span>
                            </div>

                            <div className="flex flex-col items-center justify-center w-12 ml-8">
                               <div className="bg-[#1b72e8] rounded-full p-1 text-white">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="13 17 18 12 13 7"></polyline><line x1="6" y1="12" x2="18" y2="12"></line></svg>
                               </div>
                               <span className="text-[10px] text-blue-400 mt-1">{tx['round-time'] ? format(new Date(tx['round-time'] * 1000), 'MMM dd') : 'N/A'}</span>
                            </div>
                            
                            <div className="flex-1 ml-4 overflow-hidden">
                              <div className="flex justify-between items-center text-[13px] mb-1.5">
                                <span className="text-gray-400 flex items-center gap-1">ID: 
                                   <Link href={`/tx/${tx.id}`} className="text-[#1b72e8] truncate w-24 sm:w-32 lg:w-48 inline-block align-bottom cursor-pointer hover:underline">
                                      {tx.id}
                                   </Link>
                                </span>
                                <span className={`text-xs flex items-center gap-1 font-medium px-2 py-0.5 rounded ${tx.sender === address ? 'bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400' : 'bg-green-50 text-[#3fc15d] dark:bg-green-900/20'}`}>
                                   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                   {tx.sender === address ? '-' : '+'}{getTxTokenInfo(tx, assetCache).amount}{' '}
                                   {getTxTokenInfo(tx, assetCache).assetId > 0 ? (
                                      <Link href={`/asset/${getTxTokenInfo(tx, assetCache).assetId}`} className="hover:underline">
                                         {getTxTokenInfo(tx, assetCache).token}
                                      </Link>
                                   ) : (
                                      getTxTokenInfo(tx, assetCache).token
                                   )}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-[13px]">
                                 <div className="flex gap-4 text-gray-400">
                                    <div className="truncate w-24 sm:w-32">From: <Link href={`/address/${tx.sender}`} className="text-[#1b72e8] hover:underline">{tx.sender === address ? 'This Account' : `${tx.sender.substring(0, 10)}...`}</Link></div>
                                    {tx['payment-transaction']?.receiver || tx['asset-transfer-transaction']?.receiver ? (
                                       <div className="truncate w-24 sm:w-32">To: <Link href={`/address/${tx['payment-transaction']?.receiver || tx['asset-transfer-transaction']?.receiver}`} className="text-[#1b72e8] hover:underline">{tx['payment-transaction']?.receiver === address || tx['asset-transfer-transaction']?.receiver === address ? 'This Account' : `${(tx['payment-transaction']?.receiver || tx['asset-transfer-transaction']?.receiver).substring(0, 10)}...`}</Link></div>
                                    ) : (
                                       <div className="truncate w-24 sm:w-32">To: N/A</div>
                                    )}
                                 </div>
                              </div>
                            </div>
                         </div>
                      )) : (
                         <div className="p-8 text-center text-gray-500 text-sm">No transactions found.</div>
                      )}
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

AddressDetailPage.getLayout = function getLayout(page: any) {
  return <RootLayout>{page}</RootLayout>;
};

export default AddressDetailPage;
