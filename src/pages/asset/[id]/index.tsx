import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import type { NextPageWithLayout } from '@/types';
import { NextSeo } from 'next-seo';
import RootLayout from '@/layouts/_root-layout';
import axios from 'axios';
import Link from 'next/link';
import { format } from 'date-fns';

const short = (s: string) => s ? `${s.slice(0, 6)}…${s.slice(-4)}` : '—';

const fmtSupply = (val: string | number, decimals: number, unit: string) => {
  const n = typeof val === 'string' ? parseInt(val) : val;
  const actual = decimals > 0 ? n / Math.pow(10, decimals) : n;
  if (actual >= 1e9) return `${(actual / 1e9).toFixed(2)}B ${unit}`;
  if (actual >= 1e6) return `${(actual / 1e6).toFixed(2)}M ${unit}`;
  if (actual >= 1e3) return `${(actual / 1e3).toFixed(2)}K ${unit}`;
  return `${actual.toLocaleString()} ${unit}`;
};

const fmtPrice = (p: string) => {
  const n = parseFloat(p);
  if (!n) return '$0.00';
  if (n < 0.0001) return `$${n.toExponential(2)}`;
  if (n < 1) return `$${n.toFixed(6)}`;
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const TX_TYPE: Record<string, { label: string; color: string }> = {
  axfer: { label: 'Transfer', color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400' },
  acfg:  { label: 'Config',   color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400' },
  appl:  { label: 'App Call', color: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400' },
  pay:   { label: 'Payment',  color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400' },
};

const AddrRow = ({ label, address, nfd }: { label: string; address: string; nfd?: string }) => (
  <div className="flex items-start justify-between py-3 gap-4">
    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider shrink-0 w-28">{label}</span>
    <Link href={`/address/${address}`} className="font-mono text-xs text-[#1b72e8] hover:underline break-all text-right">
      {nfd ? (
        <span className="flex flex-col items-end gap-0.5">
          <span className="font-medium">{nfd}</span>
          <span className="text-gray-400">{address}</span>
        </span>
      ) : address}
    </Link>
  </div>
);

const AssetDetailPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { id } = router.query;

  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [holdersCount, setHoldersCount] = useState<string | null>(null);
  const [nfdCache, setNfdCache] = useState<Record<string, string>>({});
  const [imgError, setImgError] = useState(false);
  const [showTx, setShowTx] = useState(false);

  // Transactions state - we keep a buffer of newest-first txs and paginate client-side
  const [txs, setTxs] = useState<any[]>([]);
  const [txPage, setTxPage] = useState(0);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState('');
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const TX_PER_PAGE = 25;

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');
    setAsset(null);
    setHoldersCount(null);
    setNfdCache({});
    setImgError(false);
    setShowTx(false);

    Promise.all([
      axios.get(`https://api.perawallet.app/v1/public/assets/${id}/`).catch(() => null),
      axios.get(`https://mainnet-idx.algonode.cloud/v2/assets/${id}`).catch(() => null),
    ]).then(([peraRes, indexerRes]) => {
      if (!peraRes && !indexerRes) { setError('Asset not found.'); return; }
      setAsset({ pera: peraRes?.data ?? null, indexer: indexerRes?.data?.asset ?? null });

      const addresses = [
        peraRes?.data?.creator_address,
        indexerRes?.data?.asset?.params?.manager,
        indexerRes?.data?.asset?.params?.reserve,
        indexerRes?.data?.asset?.params?.freeze,
        indexerRes?.data?.asset?.params?.clawback,
      ].filter(Boolean) as string[];

      if (addresses.length) {
        const url = `https://api.nf.domains/nfd/lookup?` + addresses.map(a => `address=${a}`).join('&');
        axios.get(url).then(res => {
          const cache: Record<string, string> = {};
          Object.keys(res.data).forEach(a => { cache[a] = res.data[a].name; });
          setNfdCache(cache);
        }).catch(() => {});
      }

      axios.get(`https://mainnet-idx.algonode.cloud/v2/assets/${id}/balances?limit=1000&currency-greater-than=0`)
        .then(res => setHoldersCount(res.data['next-token'] ? '1,000+' : (res.data.balances?.length ?? 0).toLocaleString()))
        .catch(() => setHoldersCount('N/A'));

    }).catch(e => setError(e.message || 'Failed to load.')).finally(() => setLoading(false));
  }, [id]);

  // Fetch newest transactions before a given round (or current if undefined).
  // Indexer returns oldest-first, so we expand window until we have enough, then reverse.
  const fetchOlderBatch = useCallback(async (maxRound?: number) => {
    if (!id) return;
    setTxLoading(true);
    setTxError('');
    try {
      let upper = maxRound;
      if (upper === undefined) {
        const health = await fetch('https://mainnet-idx.algonode.cloud/health').then(r => r.json());
        upper = health.round as number;
      }

      let windowSize = 50000;
      let collected: any[] = [];
      let truncated = false;

      while (windowSize <= 200_000_000) {
        const lower = Math.max(0, upper - windowSize);
        const u = new URL(`https://mainnet-idx.algonode.cloud/v2/assets/${id}/transactions`);
        u.searchParams.set('min-round', String(lower));
        u.searchParams.set('max-round', String(upper));
        u.searchParams.set('limit', '1000');
        const r = await fetch(u.toString());
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        const list = (d.transactions || []) as any[];
        collected = list.slice().reverse(); // newest-first within window
        truncated = !!d['next-token']; // more transactions exist within this window
        if (collected.length >= TX_PER_PAGE || lower === 0) break;
        windowSize *= 4;
      }

      setTxs(prev => maxRound === undefined ? collected : [...prev, ...collected]);
      setHasMoreOlder(truncated || collected.length >= TX_PER_PAGE);
    } catch (e: any) {
      setTxError(e.message);
    } finally {
      setTxLoading(false);
    }
  }, [id]);

  const handleToggleTx = () => {
    if (!showTx) {
      setTxs([]);
      setTxPage(0);
      setHasMoreOlder(false);
      fetchOlderBatch();
    }
    setShowTx(v => !v);
  };

  const goNext = async () => {
    const nextStart = (txPage + 1) * TX_PER_PAGE;
    // If buffer doesn't have enough for next page, fetch older batch
    if (nextStart >= txs.length && hasMoreOlder) {
      const oldest = txs[txs.length - 1]?.['confirmed-round'];
      if (oldest) await fetchOlderBatch(oldest - 1);
    }
    setTxPage(p => p + 1);
  };

  const goPrev = () => setTxPage(p => Math.max(0, p - 1));

  const txStart = txPage * TX_PER_PAGE;
  const visibleTxs = txs.slice(txStart, txStart + TX_PER_PAGE);
  const canGoNext = txStart + TX_PER_PAGE < txs.length || hasMoreOlder;
  const canGoPrev = txPage > 0;

  const pera = asset?.pera;
  const indexer = asset?.indexer;
  const params = indexer?.params ?? {};
  const name = pera?.name || params.name || 'Unknown Asset';
  const unit = pera?.unit_name || params['unit-name'] || '';
  const decimals = pera?.fraction_decimals ?? params.decimals ?? 0;
  const logoSrc = pera?.logo || `https://asa-list.tinyman.org/assets/${id}/icon.png`;
  const creator = pera?.creator_address || params.creator;
  const asaUrl = pera?.url || params.url;

  const change24h = pera?.usd_value && pera?.usd_value_24_hour_ago
    ? ((parseFloat(pera.usd_value) - parseFloat(pera.usd_value_24_hour_ago)) / parseFloat(pera.usd_value_24_hour_ago)) * 100
    : null;

  const circulatingSupply = pera?.circulating_supply
    ? fmtSupply(pera.circulating_supply, decimals, unit)
    : params.total ? fmtSupply(params.total, decimals, unit) : '—';

  const fmtTxAmount = (tx: any) => {
    const axfer = tx['asset-transfer-transaction'];
    if (!axfer) return '—';
    const amt = axfer.amount / Math.pow(10, decimals);
    if (!amt) return <span className="text-gray-400 text-xs">opt-in</span>;
    return `${amt.toLocaleString(undefined, { maximumFractionDigits: decimals })} ${unit}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0d1117]">
      <NextSeo title={asset ? `${name} (${unit}) — euro.algo` : 'ASA Details — euro.algo'} />

      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">

        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1b72e8] transition-colors mb-6"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>

        {loading && <div className="flex items-center justify-center py-32 text-gray-400 text-sm">Loading asset...</div>}
        {error && !loading && <div className="flex items-center justify-center py-32 text-red-400 text-sm">{error}</div>}

        {asset && !loading && (
          <div className="space-y-4">

            {/* Hero card */}
            <div className="bg-white dark:bg-[#111827] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="shrink-0">
                  {!imgError ? (
                    <img src={logoSrc} alt={name}
                      className="w-16 h-16 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                      onError={() => setImgError(true)} />
                  ) : (
                    <div className="w-16 h-16 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-lg font-bold text-gray-400">
                      {unit.slice(0, 2)}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{name}</h1>
                    {unit && <span className="text-sm font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{unit}</span>}
                    {pera?.verification_tier === 'verified' && (
                      <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/50 px-2 py-0.5 rounded-full">verified</span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-3 mt-1 flex-wrap">
                    {pera?.usd_value ? (
                      <>
                        <span className="text-3xl font-bold text-gray-900 dark:text-white">{fmtPrice(pera.usd_value)}</span>
                        {change24h !== null && (
                          <span className={`text-sm font-semibold ${change24h >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}% <span className="font-normal text-gray-400">24h</span>
                          </span>
                        )}
                      </>
                    ) : <span className="text-gray-400 text-sm">No price data</span>}
                  </div>
                  <div className="text-xs text-gray-400 mt-1 font-mono">ID: {id}</div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleToggleTx}
                    className={`flex items-center gap-1.5 text-xs font-medium transition-colors rounded-lg px-3 py-2 border ${
                      showTx
                        ? 'bg-[#1b72e8] border-[#1b72e8] text-white'
                        : 'border-gray-200 dark:border-gray-700 text-gray-500 hover:text-[#1b72e8] hover:border-[#1b72e8]'
                    }`}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                    Transactions
                  </button>
                  {asaUrl && (
                    <a href={asaUrl.startsWith('http') ? asaUrl : `https://${asaUrl}`} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#1b72e8] transition-colors border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
                      Website
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Circulating Supply', value: circulatingSupply },
                { label: 'Decimals', value: String(decimals) },
                { label: 'Holders', value: holdersCount ?? '…' },
                { label: 'Created at Round', value: indexer?.['created-at-round']?.toLocaleString() ?? '—' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white dark:bg-[#111827] rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">{label}</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{value}</div>
                </div>
              ))}
            </div>

            {/* Addresses */}
            {!showTx && (creator || params.manager || params.reserve || params.freeze || params.clawback) && (
              <div className="bg-white dark:bg-[#111827] rounded-xl border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Addresses</h2>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {creator && <AddrRow label="Creator" address={creator} nfd={nfdCache[creator]} />}
                  {params.manager && <AddrRow label="Manager" address={params.manager} nfd={nfdCache[params.manager]} />}
                  {params.reserve && <AddrRow label="Reserve" address={params.reserve} nfd={nfdCache[params.reserve]} />}
                  {params.freeze && <AddrRow label="Freeze" address={params.freeze} nfd={nfdCache[params.freeze]} />}
                  {params.clawback && <AddrRow label="Clawback" address={params.clawback} nfd={nfdCache[params.clawback]} />}
                </div>
              </div>
            )}

            {/* Transactions */}
            {showTx && (
              <div className="bg-white dark:bg-[#111827] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Transactions</h2>
                  <div className="flex items-center gap-3 text-sm">
                    <button onClick={goPrev} disabled={!canGoPrev}
                      className="flex items-center gap-1 text-gray-400 hover:text-[#1b72e8] disabled:opacity-25 disabled:cursor-not-allowed transition-colors">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                      Prev
                    </button>
                    <button onClick={goNext} disabled={!canGoNext}
                      className="flex items-center gap-1 text-gray-400 hover:text-[#1b72e8] disabled:opacity-25 disabled:cursor-not-allowed transition-colors">
                      Next
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  </div>
                </div>

                {txLoading && <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Loading transactions...</div>}
                {txError && <div className="flex items-center justify-center py-16 text-red-400 text-sm">{txError}</div>}

                {!txLoading && !txError && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left border-b border-gray-100 dark:border-gray-800">
                          <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Tx ID</th>
                          <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Type</th>
                          <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">From</th>
                          <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">To</th>
                          <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 text-right">Amount</th>
                          <th className="px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 text-right hidden sm:table-cell">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                        {visibleTxs.map(tx => {
                          const axfer = tx['asset-transfer-transaction'];
                          const typeInfo = TX_TYPE[tx['tx-type']] ?? { label: tx['tx-type'].toUpperCase(), color: 'text-gray-500 bg-gray-100 dark:bg-gray-800' };
                          return (
                            <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                              <td className="px-6 py-3">
                                <Link href={`/tx/${tx.id}`} className="font-mono text-[#1b72e8] hover:underline text-xs">{short(tx.id)}</Link>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${typeInfo.color}`}>{typeInfo.label}</span>
                              </td>
                              <td className="px-4 py-3">
                                <Link href={`/address/${tx.sender}`} className="font-mono text-xs text-gray-600 dark:text-gray-300 hover:text-[#1b72e8] transition-colors">{short(tx.sender)}</Link>
                              </td>
                              <td className="px-4 py-3">
                                {axfer?.receiver
                                  ? <Link href={`/address/${axfer.receiver}`} className="font-mono text-xs text-gray-600 dark:text-gray-300 hover:text-[#1b72e8] transition-colors">{short(axfer.receiver)}</Link>
                                  : <span className="text-gray-400 text-xs">—</span>}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-xs text-gray-800 dark:text-gray-200">{fmtTxAmount(tx)}</td>
                              <td className="px-6 py-3 text-right text-xs text-gray-400 hidden sm:table-cell whitespace-nowrap">
                                {tx['round-time'] ? format(new Date(tx['round-time'] * 1000), 'MMM d yyyy, HH:mm') : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

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
