import { useState, useEffect, useRef } from 'react';
import type { NextPageWithLayout } from '@/types';
import { NextSeo } from 'next-seo';
import RootLayout from '@/layouts/_root-layout';
import axios from 'axios';
import Link from 'next/link';

// Module-level cache so it persists across navigations
let assetCache: Asset[] = [];
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// CoinGecko id → Algorand ASA ID map (fetched once)
let asaIdMap: Record<string, string> = {};

interface Asset {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_percentage_24h: number;
  circulating_supply: number;
  asaId?: string; // Algorand ASA numeric ID
}

const formatPrice = (p: number) => {
  if (!p) return '$0';
  if (p < 0.0001) return `$${p.toExponential(2)}`;
  if (p < 1) return `$${p.toFixed(4)}`;
  return `$${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatLarge = (n: number) => {
  if (!n) return '—';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
};

const AssetsPage: NextPageWithLayout = () => {
  const [assets, setAssets] = useState<Asset[]>(assetCache);
  const [filtered, setFiltered] = useState<Asset[]>(assetCache);
  const [loading, setLoading] = useState(assetCache.length === 0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<keyof Asset>('market_cap_rank');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const PER_PAGE = 50;

  useEffect(() => {
    const now = Date.now();
    if (assetCache.length > 0 && now - cacheTimestamp < CACHE_TTL) {
      setAssets(assetCache);
      setFiltered(assetCache);
      setLoading(false);
      return;
    }

    const fetchAll = async () => {
      setLoading(true);
      try {
        // Fetch ASA ID map if not yet loaded
        if (Object.keys(asaIdMap).length === 0) {
          const listRes = await axios.get('https://api.coingecko.com/api/v3/coins/list?include_platform=true', { timeout: 8000 }).catch(() => null);
          if (listRes?.data) {
            listRes.data.forEach((coin: any) => {
              const asaId = coin.platforms?.algorand;
              if (asaId) asaIdMap[coin.id] = asaId;
            });
          }
        }

        const pages = await Promise.all([1, 2, 3, 4].map(p =>
          axios.get(`https://api.coingecko.com/api/v3/coins/markets`, {
            params: {
              vs_currency: 'usd',
              category: 'algorand-ecosystem',
              per_page: 50,
              page: p,
              sparkline: false,
              price_change_percentage: '24h',
            },
            timeout: 8000,
          }).catch(() => ({ data: [] }))
        ));

        const all: Asset[] = pages.flatMap(r => r.data || []).map((a: Asset) => ({
          ...a,
          asaId: asaIdMap[a.id] || undefined,
        }));

        if (all.length > 0) {
          assetCache = all;
          cacheTimestamp = Date.now();
          setAssets(all);
          setFiltered(all);
        }
      } catch (e) {}
      setLoading(false);
    };

    fetchAll();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    const result = assets.filter(a =>
      a.name.toLowerCase().includes(q) || a.symbol.toLowerCase().includes(q)
    );
    setFiltered(result);
    setPage(1);
  }, [search, assets]);

  const sorted = [...filtered].sort((a, b) => {
    const av = (a[sortKey] as number) ?? 0;
    const bv = (b[sortKey] as number) ?? 0;
    return sortDir === 'asc' ? av - bv : bv - av;
  });

  const paginated = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(sorted.length / PER_PAGE);

  const handleSort = (key: keyof Asset) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortIcon = ({ k }: { k: keyof Asset }) => (
    <span className="ml-1 opacity-40 text-xs">
      {sortKey === k ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
    </span>
  );

  return (
    <>
      <NextSeo title="Assets — euro.algo" />
      <div className="min-h-screen bg-gray-50 dark:bg-[#0d1117] px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Assets</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {assets.length} assets in the Algorand ecosystem
                {cacheTimestamp > 0 && (
                  <span className="ml-2 text-xs text-gray-400">· cached {Math.round((Date.now() - cacheTimestamp) / 60000)}m ago</span>
                )}
              </p>
            </div>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter by name or symbol..."
              className="w-full sm:w-72 h-9 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111827] text-sm focus:outline-none focus:ring-1 focus:ring-[#1b72e8] text-gray-800 dark:text-gray-100 placeholder-gray-400"
            />
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm shadow-sm overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-24 text-gray-400">Loading assets...</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-left">
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 w-10">#</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Asset</th>
                    <th
                      className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 cursor-pointer hover:text-gray-300 text-right"
                      onClick={() => handleSort('current_price')}
                    >Price <SortIcon k="current_price" /></th>
                    <th
                      className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 cursor-pointer hover:text-gray-300 text-right"
                      onClick={() => handleSort('price_change_percentage_24h')}
                    >24h <SortIcon k="price_change_percentage_24h" /></th>
                    <th
                      className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 cursor-pointer hover:text-gray-300 text-right hidden md:table-cell"
                      onClick={() => handleSort('market_cap')}
                    >Market Cap <SortIcon k="market_cap" /></th>
                    <th
                      className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 cursor-pointer hover:text-gray-300 text-right hidden lg:table-cell"
                      onClick={() => handleSort('total_volume')}
                    >Volume 24h <SortIcon k="total_volume" /></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {paginated.map((asset, i) => {
                    const change = asset.price_change_percentage_24h;
                    const positive = change >= 0;
                    return (
                      <tr key={asset.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-3 text-gray-400 text-xs">{asset.market_cap_rank || ((page - 1) * PER_PAGE + i + 1)}</td>
                        <td className="px-4 py-3">
                          <Link href={asset.asaId ? `/asset/${asset.asaId}` : `/asset/${asset.id}`} className="flex items-center gap-3 group">
                            <img
                              src={asset.image}
                              alt={asset.name}
                              className="w-7 h-7 rounded-full"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white group-hover:text-[#1b72e8] transition-colors">{asset.name}</div>
                              <div className="text-xs text-gray-400 uppercase">{asset.symbol}</div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-gray-800 dark:text-gray-100">{formatPrice(asset.current_price)}</td>
                        <td className={`px-4 py-3 text-right font-medium ${positive ? 'text-emerald-500' : 'text-red-500'}`}>
                          {change != null ? `${positive ? '+' : ''}${change.toFixed(2)}%` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400 hidden md:table-cell">{formatLarge(asset.market_cap)}</td>
                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400 hidden lg:table-cell">{formatLarge(asset.total_volume)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
              <span>{sorted.length} assets</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-30 hover:border-[#1b72e8] hover:text-[#1b72e8] transition-colors"
                >← Prev</button>
                <span className="px-2">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-30 hover:border-[#1b72e8] hover:text-[#1b72e8] transition-colors"
                >Next →</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
};

AssetsPage.getLayout = function getLayout(page) {
  return <RootLayout>{page}</RootLayout>;
};

export default AssetsPage;
