import { useState, useEffect, useCallback } from 'react';
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

const PAGE_SIZE = 20;

const AddressDetailPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { address } = router.query;
  const isReady = router.isReady;
  
  const [account, setAccount] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [error, setError] = useState('');
  const [nfdName, setNfdName] = useState<string | null>(null);
  const [assetCache, setAssetCache] = useState<Record<number, { name: string, decimals: number }>>({});
  const [createdAtRound, setCreatedAtRound] = useState<number | null>(null);
  const [createdDate, setCreatedDate] = useState<string | null>(null);
  
  // Pagination state
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [pageHistory, setPageHistory] = useState<string[]>([]); // stores next-tokens for previous pages
  const [currentPage, setCurrentPage] = useState(1);

  const fetchAssetCacheForTxs = useCallback(async (txs: any[]) => {
    const assetIds = new Set<number>();
    txs.forEach((tx: any) => {
      if (tx['tx-type'] === 'axfer') {
        const aid = tx['asset-transfer-transaction']?.['asset-id'];
        if (aid) assetIds.add(aid);
      }
    });

    const newCache: Record<number, {name: string, decimals: number}> = {};
    const promises = Array.from(assetIds)
      .filter(aid => !assetCache[aid])
      .map(aid => 
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
    
    await Promise.all(promises);
    if (Object.keys(newCache).length > 0) {
      setAssetCache(prev => ({ ...prev, ...newCache }));
    }
  }, [assetCache]);

  const fetchTransactions = useCallback(async (addr: string, token?: string) => {
    setTxLoading(true);
    try {
      let url = `https://mainnet-idx.algonode.cloud/v2/accounts/${addr}/transactions?limit=${PAGE_SIZE}`;
      if (token) url += `&next=${token}`;
      
      const txRes = await axios.get(url);
      const txs = txRes.data.transactions || [];
      setTransactions(txs);
      setNextToken(txRes.data['next-token'] || null);
      
      await fetchAssetCacheForTxs(txs);
    } catch (err) {
      console.error('Failed to fetch transactions', err);
    } finally {
      setTxLoading(false);
    }
  }, [fetchAssetCacheForTxs]);

  useEffect(() => {
    if (!isReady || !address || typeof address !== 'string') return;
    
    const fetchData = async () => {
      setLoading(true);
      setError('');
      setPageHistory([]);
      setCurrentPage(1);
      setNextToken(null);
      
      try {
        // Fetch Account Info
        const accRes = await axios.get(`https://mainnet-idx.algonode.cloud/v2/accounts/${address}`);
        const acc = accRes.data.account;
        setAccount(acc);
        setCreatedAtRound(acc['created-at-round'] || null);
        
        // Fetch block timestamp for created-at-round
        if (acc['created-at-round']) {
           axios.get(`https://mainnet-idx.algonode.cloud/v2/blocks/${acc['created-at-round']}`)
             .then(blockRes => {
                const ts = blockRes.data?.timestamp;
                if (ts) {
                   setCreatedDate(format(new Date(ts * 1000), 'MMM dd, yyyy HH:mm'));
                }
             }).catch(() => {});
        }
        
        // Fetch first page of Transactions
        const txRes = await axios.get(`https://mainnet-idx.algonode.cloud/v2/accounts/${address}/transactions?limit=${PAGE_SIZE}`);
        const txs = txRes.data.transactions || [];
        setTransactions(txs);
        setNextToken(txRes.data['next-token'] || null);

        // Fetch NFD
        axios.get(`https://api.nf.domains/nfd/lookup?address=${address}`)
          .then(res => {
             if (res.data[address] && res.data[address].name) {
                setNfdName(res.data[address].name);
             }
          }).catch(() => {});

        // Build Asset Cache for TXs
        const assetIds = new Set<number>();
        txs.forEach((tx: any) => {
           if (tx['tx-type'] === 'axfer') {
              const aid = tx['asset-transfer-transaction']?.['asset-id'];
              if (aid) assetIds.add(aid);
           }
        });

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
        
        await Promise.all(promises);
        setAssetCache(newCache);
        
      } catch (err: any) {
        setError(err.response?.data?.message || 'Account not found.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [address, isReady]);

  const handleNextPage = async () => {
    if (!nextToken || !address || typeof address !== 'string') return;
    
    // Save current next-token so we can come back
    setPageHistory(prev => [...prev, nextToken]);
    setCurrentPage(prev => prev + 1);
    await fetchTransactions(address, nextToken);
  };

  const handlePrevPage = async () => {
    if (pageHistory.length === 0 || !address || typeof address !== 'string') return;
    
    const newHistory = [...pageHistory];
    newHistory.pop(); // remove current page's token
    setPageHistory(newHistory);
    setCurrentPage(prev => prev - 1);
    
    // If going back to page 1, fetch without token
    const prevToken = newHistory.length > 0 ? newHistory[newHistory.length - 1] : undefined;
    await fetchTransactions(address, prevToken);
  };

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

             {/* Info Row */}
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 shadow-sm rounded-sm p-4">
                   <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Created at Round</div>
                   <div className="text-gray-800 dark:text-white font-medium">{createdAtRound ? createdAtRound.toLocaleString() : 'N/A'}</div>
                </div>
                <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 shadow-sm rounded-sm p-4">
                   <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Created Date</div>
                   <div className="text-gray-800 dark:text-white font-medium">{createdDate || 'Loading...'}</div>
                </div>
                <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 shadow-sm rounded-sm p-4">
                   <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Status</div>
                   <div className={`font-medium ${account.status === 'Online' ? 'text-[#3fc15d]' : 'text-gray-500'}`}>{account.status || 'Unknown'}</div>
                </div>
                <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 shadow-sm rounded-sm p-4">
                   <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Min Balance</div>
                   <div className="text-gray-800 dark:text-white font-medium">₳ {((account['min-balance'] || 0) / 1e6).toLocaleString()}</div>
                </div>
                <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 shadow-sm rounded-sm p-4">
                   <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Total Rewards</div>
                   <div className="text-gray-800 dark:text-white font-medium">₳ {((account.rewards || 0) / 1e6).toLocaleString(undefined, {maximumFractionDigits: 4})}</div>
                </div>
             </div>

             {/* Transactions */}
             <div>
                <div className="flex items-center justify-between mb-3">
                   <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Transactions</h2>
                   <span className="text-sm text-gray-500">Page {currentPage}</span>
                </div>
                <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 shadow-sm rounded-sm">
                   {txLoading && (
                      <div className="p-8 text-center text-gray-500">Loading transactions...</div>
                   )}
                   {!txLoading && transactions.length > 0 && transactions.map((tx: any, i: number) => (
                      <div key={tx.id || i} className="flex items-center px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                         <span className="text-[10px] text-gray-400 w-16 shrink-0">{tx['round-time'] ? format(new Date(tx['round-time'] * 1000), 'MMM dd') : 'N/A'}</span>
                         
                         <span className="text-[11px] text-gray-400 uppercase tracking-wider w-20 shrink-0 font-medium">{getTxTypeLabel(tx['tx-type']).substring(0, 10)}</span>

                         <Link href={`/tx/${tx.id}`} className="text-[#1b72e8] truncate w-32 sm:w-48 lg:w-64 text-[13px] cursor-pointer hover:underline shrink-0">
                            {tx.id}
                         </Link>
                         
                         <div className="flex-1" />

                         <span className={`text-xs flex items-center gap-1 font-medium px-2 py-0.5 rounded shrink-0 ${tx.sender === address ? 'bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400' : 'bg-green-50 text-[#3fc15d] dark:bg-green-900/20'}`}>
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
                   ))}
                   {!txLoading && transactions.length === 0 && (
                      <div className="p-8 text-center text-gray-500 text-sm">No transactions found.</div>
                   )}

                   {/* Pagination Controls */}
                   {!txLoading && transactions.length > 0 && (
                      <div className="flex items-center justify-between p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
                         <button
                            onClick={handlePrevPage}
                            disabled={currentPage <= 1}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-sm border transition-colors ${
                               currentPage <= 1
                                  ? 'text-gray-300 dark:text-gray-600 border-gray-200 dark:border-gray-800 cursor-not-allowed'
                                  : 'text-[#1b72e8] border-[#1b72e8]/30 hover:bg-[#1b72e8]/10 cursor-pointer'
                            }`}
                         >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
                            Previous
                         </button>
                         <span className="text-sm text-gray-500 font-medium">Page {currentPage}</span>
                         <button
                            onClick={handleNextPage}
                            disabled={!nextToken}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-sm border transition-colors ${
                               !nextToken
                                  ? 'text-gray-300 dark:text-gray-600 border-gray-200 dark:border-gray-800 cursor-not-allowed'
                                  : 'text-[#1b72e8] border-[#1b72e8]/30 hover:bg-[#1b72e8]/10 cursor-pointer'
                            }`}
                         >
                            Next
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                         </button>
                      </div>
                   )}
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
