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

const renderAddress = (address: string, nfdCache: Record<string, string>) => {
  if (!address) return 'N/A';
  const nfd = nfdCache[address];
  return nfd ? nfd : address;
};

const TransactionDetailPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { id } = router.query;
  
  const [tx, setTx] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assetDetails, setAssetDetails] = useState<{ name: string, decimals: number } | null>(null);
  const [nfdCache, setNfdCache] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    
    const fetchTx = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await axios.get(`https://mainnet-idx.algonode.cloud/v2/transactions/${id}`);
        const transaction = response.data.transaction;
        setTx(transaction);
        
        // Fetch NFDs
        const sender = transaction.sender;
        const receiver = transaction['payment-transaction']?.receiver || transaction['asset-transfer-transaction']?.receiver;
        
        const addressesToFetch = new Set<string>();
        if (sender) addressesToFetch.add(sender);
        if (receiver) addressesToFetch.add(receiver);
        
        if (addressesToFetch.size > 0) {
          const url = `https://api.nf.domains/nfd/lookup?` + Array.from(addressesToFetch).map(a => `address=${a}`).join('&');
          axios.get(url).then(res => {
             const newCache: Record<string, string> = {};
             Object.keys(res.data).forEach(addr => {
                newCache[addr] = res.data[addr].name;
             });
             setNfdCache(newCache);
          }).catch(() => {});
        }

        // Fetch Asset Details if axfer
        if (transaction['tx-type'] === 'axfer') {
          const assetId = transaction['asset-transfer-transaction']?.['asset-id'];
          if (assetId) {
            axios.get(`https://mainnet-idx.algonode.cloud/v2/assets/${assetId}`).then(res => {
               const params = res.data?.asset?.params;
               if (params) {
                  setAssetDetails({ 
                     name: params['unit-name'] || params.name || `ASA ${assetId}`, 
                     decimals: params.decimals || 0 
                  });
               }
            }).catch(() => {
               setAssetDetails({ name: `ASA ${assetId}`, decimals: 0 });
            });
          }
        }
        
      } catch (err: any) {
        setError(err.response?.data?.message || 'Transaction not found.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTx();
  }, [id]);

  const renderAmount = () => {
     if (!tx) return '0';
     if (tx['tx-type'] === 'pay') {
        return `${((tx['payment-transaction']?.amount || 0) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 6 })} Algo`;
     } else if (tx['tx-type'] === 'axfer') {
        const amount = tx['asset-transfer-transaction']?.amount || 0;
        const assetId = tx['asset-transfer-transaction']?.['asset-id'];
        let formatted = amount.toLocaleString();
        let name = `ASA ${assetId}`;
        if (assetDetails) {
           formatted = assetDetails.decimals > 0 ? (amount / Math.pow(10, assetDetails.decimals)).toLocaleString(undefined, { maximumFractionDigits: assetDetails.decimals }) : amount.toLocaleString();
           name = assetDetails.name;
        }
        return (
          <>
            {formatted}{' '}
            <Link href={`/asset/${assetId}`} className="text-[#1b72e8] hover:underline">
              {name}
            </Link>
          </>
        );
     }
     return '0';
  };

  return (
    <div className="bg-[#f8f9fa] dark:bg-dark min-h-[calc(100vh-140px)] -mt-4 -mx-4 sm:-mx-6 lg:-mx-8">
      <NextSeo title={`Transaction ${id} - euro.algo Explorer`} description="Algorand Transaction Details" />
      
      <div className="mx-auto max-w-[1200px] w-full p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex items-center gap-4">
           <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 p-2 rounded-sm shadow-sm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
           </button>
           <h1 className="text-2xl font-light text-gray-800 dark:text-white">Transaction Details</h1>
        </div>

        {loading && (
           <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 p-8 shadow-sm rounded-sm text-center text-gray-500">
              Loading transaction...
           </div>
        )}

        {error && !loading && (
           <div className="bg-white dark:bg-[#111827] border border-red-200 dark:border-red-900/30 p-8 shadow-sm rounded-sm text-center text-red-500">
              {error}
           </div>
        )}

        {tx && !loading && (
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 shadow-sm rounded-sm overflow-hidden">
             
             {/* Header */}
             <div className="border-b border-gray-100 dark:border-gray-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50 dark:bg-gray-800/20">
                <div>
                   <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Transaction ID</div>
                   <div className="text-lg font-mono text-[#1b72e8] break-all">{tx.id}</div>
                </div>
                <div className="flex gap-2">
                   <span className="bg-blue-50 text-[#1b72e8] dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1 rounded text-xs font-semibold uppercase tracking-wide border border-blue-100 dark:border-blue-800/50">
                      {getTxTypeLabel(tx['tx-type'])}
                   </span>
                   <span className="bg-green-50 text-[#3fc15d] dark:bg-green-900/30 dark:text-green-400 px-3 py-1 rounded text-xs font-semibold uppercase tracking-wide border border-green-100 dark:border-green-800/50 flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      Confirmed
                   </span>
                </div>
             </div>

             <div className="p-0">
                <dl className="divide-y divide-gray-100 dark:divide-gray-800">
                   
                   <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                      <dt className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider md:col-span-1">Amount</dt>
                      <dd className="text-gray-800 dark:text-gray-200 font-medium md:col-span-2 text-base">
                         {renderAmount()}
                      </dd>
                   </div>

                   <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                      <dt className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider md:col-span-1">Block / Round</dt>
                      <dd className="text-[#1b72e8] font-medium md:col-span-2 cursor-pointer hover:underline">
                         {tx['confirmed-round']?.toLocaleString() || 'Pending'}
                      </dd>
                   </div>

                   <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                      <dt className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider md:col-span-1">Timestamp</dt>
                      <dd className="text-gray-800 dark:text-gray-200 md:col-span-2">
                         {tx['round-time'] ? format(new Date(tx['round-time'] * 1000), 'MMM dd, yyyy HH:mm:ss') : 'Unknown'}
                      </dd>
                   </div>

                   <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                      <dt className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider md:col-span-1">Sender</dt>
                      <dd className="md:col-span-2">
                         <Link href={`/address/${tx.sender}`} className="font-mono text-[#1b72e8] hover:underline cursor-pointer break-all text-[14px]" title={tx.sender}>
                            {renderAddress(tx.sender, nfdCache)}
                         </Link>
                         {nfdCache[tx.sender] && <div className="text-xs text-gray-400 mt-1">Address: {tx.sender}</div>}
                      </dd>
                   </div>

                   {(tx['payment-transaction']?.receiver || tx['asset-transfer-transaction']?.receiver) && (
                      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                         <dt className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider md:col-span-1">Receiver</dt>
                         <dd className="md:col-span-2">
                            <Link href={`/address/${tx['payment-transaction']?.receiver || tx['asset-transfer-transaction']?.receiver}`} className="font-mono text-[#1b72e8] hover:underline cursor-pointer break-all text-[14px]" title={tx['payment-transaction']?.receiver || tx['asset-transfer-transaction']?.receiver}>
                               {renderAddress(tx['payment-transaction']?.receiver || tx['asset-transfer-transaction']?.receiver, nfdCache)}
                            </Link>
                            {nfdCache[tx['payment-transaction']?.receiver || tx['asset-transfer-transaction']?.receiver] && (
                               <div className="text-xs text-gray-400 mt-1">
                                  Address: {tx['payment-transaction']?.receiver || tx['asset-transfer-transaction']?.receiver}
                               </div>
                            )}
                         </dd>
                      </div>
                   )}

                   <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                      <dt className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider md:col-span-1">Fee</dt>
                      <dd className="text-gray-800 dark:text-gray-200 md:col-span-2">
                         ₳ {(tx.fee / 1e6).toFixed(6)}
                      </dd>
                   </div>
                   
                   {tx.note && (
                      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                         <dt className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider md:col-span-1">Note</dt>
                         <dd className="md:col-span-2 text-gray-600 dark:text-gray-300 text-sm bg-gray-50 dark:bg-gray-900/50 p-4 rounded border border-gray-100 dark:border-gray-800 break-words font-mono">
                            {Buffer.from(tx.note, 'base64').toString('utf8')}
                         </dd>
                      </div>
                   )}
                </dl>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

TransactionDetailPage.getLayout = function getLayout(page: any) {
  return <RootLayout>{page}</RootLayout>;
};

export default TransactionDetailPage;
