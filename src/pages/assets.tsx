import { useState, useEffect } from 'react';
import type { NextPageWithLayout } from '@/types';
import { NextSeo } from 'next-seo';
import RootLayout from '@/layouts/_root-layout';
import Link from 'next/link';

// Module-level cache
let assetCache: MergedAsset[] = [];
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000;

interface AsaListEntry {
  id: string;
  name: string;
  unit_name: string;
  logo: { png: string; svg: string };
  deleted: boolean;
}

interface TinymanAsset {
  id: string;
  name: string;
  unit_name: string;
  is_liquidity_token: boolean;
  last_day_volume_in_usd: string;
  last_day_price_change: string;
}

interface PeraAsset {
  asset_id: number;
  usd_value: string | null;
}

interface MergedAsset {
  asset_id: string;
  name: string;
  unit_name: string;
  logo: string;
  price_usd: number | null;
  change_24h: number | null;
  volume_24h: number | null;
}

const fmt = (p: number) => {
  if (!p) return '$0';
  if (p < 0.0001) return `$${p.toExponential(2)}`;
  if (p < 1) return `$${p.toFixed(4)}`;
  if (p < 1000) return `$${p.toFixed(2)}`;
  return `$${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const fmtCompact = (n: number) => {
  if (!n) return '—';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
};

async function fetchAssets(): Promise<MergedAsset[]> {
  const [asaListRes, analyticsRes, peraRes] = await Promise.allSettled([
    fetch('https://asa-list.tinyman.org/assets.json').then((r) => r.json()),
    fetch('https://mainnet.analytics.tinyman.org/api/v1/assets/?is_liquidity_token=false&ordering=-last_day_volume_in_usd&limit=150').then((r) => r.json()),
    fetch('https://api.perawallet.app/v1/public/assets/?limit=1000&ordering=-usd_value').then((r) => r.json()),
  ]);

  // Tinyman curated ASA list: id → { name, unit_name, logo }
  const asaMap = new Map<string, AsaListEntry>();
  if (asaListRes.status === 'fulfilled') {
    Object.values(asaListRes.value as Record<string, AsaListEntry>)
      .filter((a) => !a.deleted && a.id !== '0')
      .forEach((a) => asaMap.set(a.id, a));
  }

  // Tinyman analytics top 150 by volume
  const analyticsMap = new Map<string, TinymanAsset>();
  if (analyticsRes.status === 'fulfilled') {
    (analyticsRes.value.results as TinymanAsset[])
      .filter((a) => !a.is_liquidity_token && a.id !== '0')
      .forEach((a) => analyticsMap.set(a.id, a));
  }

  // Pera price map
  const peraMap = new Map<string, PeraAsset>();
  if (peraRes.status === 'fulfilled') {
    (peraRes.value.results as PeraAsset[])
      .filter((a) => a.usd_value)
      .forEach((a) => peraMap.set(String(a.asset_id), a));
  }

  const merged: MergedAsset[] = [];
  for (const [id, analytics] of analyticsMap) {
    const asa = asaMap.get(id);
    if (!asa) continue; // skip assets not in Tinyman's curated list

    const pera = peraMap.get(id);
    merged.push({
      asset_id: id,
      name: asa.name,
      unit_name: asa.unit_name,
      logo: asa.logo.png,
      price_usd: pera?.usd_value ? parseFloat(pera.usd_value) : null,
      change_24h: analytics.last_day_price_change ? parseFloat(analytics.last_day_price_change) : null,
      volume_24h: analytics.last_day_volume_in_usd ? parseFloat(analytics.last_day_volume_in_usd) : null,
    });
  }

  // Always include KOC if not already in list
  const PINNED_ID = '1035899249';
  if (!merged.find((a) => a.asset_id === PINNED_ID)) {
    const asa = asaMap.get(PINNED_ID);
    if (asa) {
      const pera = peraMap.get(PINNED_ID);
      merged.push({
        asset_id: PINNED_ID,
        name: asa.name,
        unit_name: asa.unit_name,
        logo: asa.logo.png,
        price_usd: pera?.usd_value ? parseFloat(pera.usd_value) : null,
        change_24h: null,
        volume_24h: null,
      });
    }
  }

  return merged.sort((a, b) => (b.volume_24h ?? 0) - (a.volume_24h ?? 0));
}

const AssetsPage: NextPageWithLayout = () => {
  const [assets, setAssets] = useState<MergedAsset[]>(assetCache);
  const [filtered, setFiltered] = useState<MergedAsset[]>(assetCache);
  const [loading, setLoading] = useState(assetCache.length === 0);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 50;

  useEffect(() => {
    const now = Date.now();
    if (assetCache.length > 0 && now - cacheTimestamp < CACHE_TTL) {
      setAssets(assetCache);
      setFiltered(assetCache);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    fetchAssets()
      .then((data) => {
        assetCache = data;
        cacheTimestamp = Date.now();
        setAssets(data);
        setFiltered(data);
      })
      .catch((e) => setError(`Failed to load: ${e.message}`))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      assets.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.unit_name.toLowerCase().includes(q) ||
          a.asset_id.includes(q)
      )
    );
    setPage(1);
  }, [search, assets]);

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  return (
    <>
      <NextSeo title="Assets — euro.algo" />
      <div className="min-h-screen bg-gray-50 dark:bg-[#0d1117] px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Assets</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {assets.length > 0 ? `Top ${assets.length} assets by 24h volume` : 'Top assets by 24h volume'}
                </p>
              </div>
              {!loading && !error && totalPages > 1 && (
                <div className="flex items-center gap-3 text-sm">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex items-center gap-1 text-gray-400 hover:text-[#1b72e8] disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                    Prev
                  </button>
                  <span className="tabular-nums text-gray-400 text-xs">{page} / {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="flex items-center gap-1 text-gray-400 hover:text-[#1b72e8] disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>
              )}
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by name, symbol or ID..."
              className="w-full h-10 px-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#111827] text-sm focus:outline-none focus:ring-1 focus:ring-[#1b72e8] text-gray-800 dark:text-gray-100 placeholder-gray-400"
            />
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 rounded-sm shadow-sm overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-24 text-gray-400 text-sm">Loading assets...</div>
            ) : error ? (
              <div className="flex items-center justify-center py-24 text-red-400 text-sm">{error}</div>
            ) : filtered.length === 0 ? (
              <div className="flex items-center justify-center py-24 text-gray-400 text-sm">No assets found.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-left">
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 w-10">#</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Asset</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">Price</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">24h</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right hidden md:table-cell">Volume 24h</th>
                    <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 hidden lg:table-cell">ASA ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {paginated.map((asset, i) => {
                    const positive = asset.change_24h !== null && asset.change_24h >= 0;
                    return (
                      <tr key={asset.asset_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-3 text-gray-400 text-xs">{(page - 1) * PER_PAGE + i + 1}</td>
                        <td className="px-4 py-3">
                          <Link href={`/asset/${asset.asset_id}`} className="flex items-center gap-3 group">
                            {asset.logo ? (
                              <img
                                src={asset.logo}
                                alt={asset.name}
                                className="w-7 h-7 rounded-full shrink-0 object-cover bg-gray-100"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full shrink-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-500">
                                {asset.unit_name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 dark:text-white group-hover:text-[#1b72e8] transition-colors truncate">
                                {asset.name}
                              </div>
                              <div className="text-xs text-gray-400 uppercase">{asset.unit_name}</div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-gray-800 dark:text-gray-100">
                          {asset.price_usd !== null ? fmt(asset.price_usd) : '—'}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${asset.change_24h === null ? 'text-gray-400' : positive ? 'text-emerald-500' : 'text-red-500'}`}>
                          {asset.change_24h === null
                            ? '—'
                            : `${positive ? '+' : ''}${asset.change_24h.toFixed(2)}%`}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400 hidden md:table-cell">
                          {asset.volume_24h !== null ? fmtCompact(asset.volume_24h) : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-400 font-mono text-xs hidden lg:table-cell">
                          {asset.asset_id}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>


        </div>
      </div>
    </>
  );
};

AssetsPage.getLayout = function getLayout(page) {
  return <RootLayout>{page}</RootLayout>;
};

export default AssetsPage;
