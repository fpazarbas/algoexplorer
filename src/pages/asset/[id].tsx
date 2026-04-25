import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import type { NextPageWithLayout } from '@/types';
import { NextSeo } from 'next-seo';
import RootLayout from '@/layouts/_root-layout';
import axios from 'axios';
import { format } from 'date-fns';
import Link from 'next/link';

const renderAddress = (address: string | undefined, nfdCache: Record<string, string>) => {
  if (!address) return 'None';
  const nfd = nfdCache[address];
  return nfd ? nfd : address;
};

const formatNumber = (num: number) => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toLocaleString();
};

const AssetDetailPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { id } = router.query;
  
  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [holdersCount, setHoldersCount] = useState<string | null>(null);
  const [nfdCache, setNfdCache] = useState<Record<string, string>>({});
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    const fetchAsset = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await axios.get(`https://mainnet-idx.algonode.cloud/v2/assets/${id}`);
        const assetData = response.data.asset;
        setAsset(assetData);
        
        // Fetch NFDs for creator and managers
        const params = assetData.params;
        const addressesToFetch = new Set<string>();
        if (params.creator) addressesToFetch.add(params.creator);
        if (params.manager) addressesToFetch.add(params.manager);
        if (params.reserve) addressesToFetch.add(params.reserve);
        if (params.freeze) addressesToFetch.add(params.freeze);
        if (params.clawback) addressesToFetch.add(params.clawback);
        
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
        
        // Fetch approximate holders
        axios.get(`https://mainnet-idx.algonode.cloud/v2/assets/${id}/balances?limit=10000&currency-greater-than=0`)
          .then(res => {
             const balances = res.data.balances || [];
             if (res.data['next-token']) {
                setHoldersCount('10,000+');
             } else {
                setHoldersCount(balances.length.toLocaleString());
             }
          }).catch(() => {
             setHoldersCount('N/A');
          });
        
      } catch (err: any) {
        setError(err.response?.data?.message || 'Asset not found.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAsset();
  }, [id]);

  const getSupplyStr = () => {
     if (!asset) return '0';
     const total = asset.params.total || 0;
     const decimals = asset.params.decimals || 0;
     const actualTotal = decimals > 0 ? (total / Math.pow(10, decimals)) : total;
     return `${actualTotal.toLocaleString()} ${asset.params['unit-name'] || ''}`;
  };

  return (
    <div className="bg-[#f8f9fa] dark:bg-dark min-h-[calc(100vh-140px)] -mt-4 -mx-4 sm:-mx-6 lg:-mx-8">
      <NextSeo title={asset ? `${asset.params.name || 'ASA'} - euro.algo Explorer` : `ASA Details`} description="Algorand Asset Details" />
      
      <div className="mx-auto max-w-[1200px] w-full p-4 sm:p-6 lg:p-8">
        <div className="mb-6 flex items-center gap-4">
           <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 p-2 rounded-sm shadow-sm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
           </button>
           <h1 className="text-2xl font-light text-gray-800 dark:text-white">ASA Details</h1>
        </div>

        {loading && (
           <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 p-8 shadow-sm rounded-sm text-center text-gray-500">
              Loading asset...
           </div>
        )}

        {error && !loading && (
           <div className="bg-white dark:bg-[#111827] border border-red-200 dark:border-red-900/30 p-8 shadow-sm rounded-sm text-center text-red-500">
              {error}
           </div>
        )}

        {asset && !loading && (
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 shadow-sm rounded-sm overflow-hidden">
             
             {/* Header */}
             <div className="border-b border-gray-100 dark:border-gray-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50 dark:bg-gray-800/20">
                <div className="flex items-center">
                   {!imgError && (
                      <img 
                         src={`https://asa-list.tinyman.org/assets/${asset.index}/icon.png`} 
                         alt="ASA Logo" 
                         className="w-10 h-10 rounded-full mr-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                         onError={() => setImgError(true)}
                      />
                   )}
                   <div>
                      <div className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-1">Asset ID</div>
                      <div className="text-lg font-mono text-[#1b72e8]">{asset.index}</div>
                   </div>
                </div>
                <div className="flex gap-2">
                   <span className="bg-blue-50 text-[#1b72e8] dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1 rounded text-xs font-semibold uppercase tracking-wide border border-blue-100 dark:border-blue-800/50">
                      {asset.params.name || 'Unknown Name'}
                   </span>
                   {asset.params['unit-name'] && (
                      <span className="bg-gray-50 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400 px-3 py-1 rounded text-xs font-semibold uppercase tracking-wide border border-gray-200 dark:border-gray-800/50">
                         {asset.params['unit-name']}
                      </span>
                   )}
                </div>
             </div>

             <div className="p-0">
                <dl className="divide-y divide-gray-100 dark:divide-gray-800">
                   
                   <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                      <dt className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider md:col-span-1">Total Supply</dt>
                      <dd className="text-gray-800 dark:text-gray-200 font-medium md:col-span-2 text-base">
                         {getSupplyStr()}
                      </dd>
                   </div>

                   <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                      <dt className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider md:col-span-1">Decimals</dt>
                      <dd className="text-gray-800 dark:text-gray-200 md:col-span-2">
                         {asset.params.decimals || 0}
                      </dd>
                   </div>

                   <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                      <dt className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider md:col-span-1">Holders</dt>
                      <dd className="text-gray-800 dark:text-gray-200 md:col-span-2">
                         {holdersCount === null ? <span className="text-gray-400">Loading...</span> : holdersCount}
                      </dd>
                   </div>

                   <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                      <dt className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider md:col-span-1">Created At Round</dt>
                      <dd className="text-[#1b72e8] md:col-span-2 cursor-pointer hover:underline">
                         {asset['created-at-round']?.toLocaleString() || 'Unknown'}
                      </dd>
                   </div>

                   <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                      <dt className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider md:col-span-1">Creator</dt>
                      <dd className="md:col-span-2">
                         <Link href={`/address/${asset.params.creator}`} className="font-mono text-[#1b72e8] hover:underline cursor-pointer break-all text-[14px]" title={asset.params.creator}>
                            {renderAddress(asset.params.creator, nfdCache)}
                         </Link>
                         {nfdCache[asset.params.creator] && <div className="text-xs text-gray-400 mt-1">Address: {asset.params.creator}</div>}
                      </dd>
                   </div>

                   {asset.params.url && (
                      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                         <dt className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider md:col-span-1">URL</dt>
                         <dd className="text-[#1b72e8] md:col-span-2 break-all hover:underline cursor-pointer">
                            <a href={asset.params.url.startsWith('http') ? asset.params.url : `https://${asset.params.url}`} target="_blank" rel="noreferrer">
                               {asset.params.url}
                            </a>
                         </dd>
                      </div>
                   )}

                   {asset.params.manager && (
                      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                         <dt className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider md:col-span-1">Manager Address</dt>
                         <dd className="md:col-span-2">
                            <Link href={`/address/${asset.params.manager}`} className="font-mono text-[#1b72e8] hover:underline cursor-pointer break-all text-[14px]" title={asset.params.manager}>
                               {renderAddress(asset.params.manager, nfdCache)}
                            </Link>
                         </dd>
                      </div>
                   )}

                   {asset.params.reserve && (
                      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                         <dt className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider md:col-span-1">Reserve Address</dt>
                         <dd className="md:col-span-2">
                            <Link href={`/address/${asset.params.reserve}`} className="font-mono text-[#1b72e8] hover:underline cursor-pointer break-all text-[14px]" title={asset.params.reserve}>
                               {renderAddress(asset.params.reserve, nfdCache)}
                            </Link>
                         </dd>
                      </div>
                   )}

                   {asset.params.freeze && (
                      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                         <dt className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider md:col-span-1">Freeze Address</dt>
                         <dd className="md:col-span-2">
                            <Link href={`/address/${asset.params.freeze}`} className="font-mono text-[#1b72e8] hover:underline cursor-pointer break-all text-[14px]" title={asset.params.freeze}>
                               {renderAddress(asset.params.freeze, nfdCache)}
                            </Link>
                         </dd>
                      </div>
                   )}

                   {asset.params.clawback && (
                      <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                         <dt className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider md:col-span-1">Clawback Address</dt>
                         <dd className="md:col-span-2">
                            <Link href={`/address/${asset.params.clawback}`} className="font-mono text-[#1b72e8] hover:underline cursor-pointer break-all text-[14px]" title={asset.params.clawback}>
                               {renderAddress(asset.params.clawback, nfdCache)}
                            </Link>
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

AssetDetailPage.getLayout = function getLayout(page: any) {
  return <RootLayout>{page}</RootLayout>;
};

export default AssetDetailPage;
