import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import type { NextPageWithLayout } from '@/types';
import { NextSeo } from 'next-seo';
import RootLayout from '@/layouts/_root-layout';
import axios from 'axios';
import { format } from 'date-fns';
import Link from 'next/link';
import { AlgoIcon } from "@/components/icons/algo-icon";
import cn from 'classnames';

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

const short = (addr: string) =>
  addr ? `${addr.substring(0, 8)}..${addr.substring(addr.length - 8)}` : '';

const renderAddress = (address: string, nfdCache: Record<string, string>) =>
  !address ? 'N/A' : nfdCache[address] || address;

const ROW_LABEL = 'text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-500 w-48 shrink-0';
const ROW_VAL = 'text-[13px] text-gray-300';

const TxRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-start gap-4 px-5 py-3 border-b border-gray-800/60 last:border-0 hover:bg-white/[0.02] transition-colors">
    <span className={ROW_LABEL}>{label}</span>
    <span className={ROW_VAL}>{children}</span>
  </div>
);

const TransactionDetailPage: NextPageWithLayout = () => {
  const router = useRouter();
  const { id } = router.query;

  const [tx, setTx] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assetDetails, setAssetDetails] = useState<{ name: string; decimals: number } | null>(null);
  const [nfdCache, setNfdCache] = useState<Record<string, string>>({});
  const [groupBalanceChanges, setGroupBalanceChanges] = useState<any[]>([]);
  const [validityTimes, setValidityTimes] = useState<{ confirmed?: string; first?: string; last?: string }>({});
  const [copied, setCopied] = useState(false);
  const [assetInfoCache, setAssetInfoCache] = useState<Record<string, { name: string; decimals: number; logoUrl: string }>>({});

  const copyTxId = () => {
    if (!tx?.id) return;
    navigator.clipboard.writeText(tx.id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => {
    if (!id) return;
    const fetchTx = async () => {
      setLoading(true); setError('');
      try {
        const { data } = await axios.get(`https://mainnet-idx.algonode.cloud/v2/transactions/${id}`);
        const t = data.transaction;
        setTx(t);

        // NFDs
        const addrs = new Set<string>();
        if (t.sender) addrs.add(t.sender);
        const rcv = t['payment-transaction']?.receiver || t['asset-transfer-transaction']?.receiver;
        if (rcv) addrs.add(rcv);
        if (addrs.size > 0) {
          axios.get(`https://api.nf.domains/nfd/lookup?` + Array.from(addrs).map(a => `address=${a}`).join('&'))
            .then(r => { const c: Record<string, string> = {}; Object.keys(r.data).forEach(a => { c[a] = r.data[a].name; }); setNfdCache(c); })
            .catch(() => {});
        }

        // Asset details
        if (t['tx-type'] === 'axfer') {
          const aid = t['asset-transfer-transaction']?.['asset-id'];
          if (aid) {
            axios.get(`https://mainnet-idx.algonode.cloud/v2/assets/${aid}`)
              .then(r => { const p = r.data?.asset?.params; if (p) setAssetDetails({ name: p['unit-name'] || p.name || `ASA ${aid}`, decimals: p.decimals || 0 }); })
              .catch(() => { setAssetDetails({ name: `ASA ${aid}`, decimals: 0 }); });
          }
        }

        // Block timestamps
        const fetchBlockTime = (block: number, key: 'confirmed' | 'first' | 'last') => {
          axios.get(`https://mainnet-idx.algonode.cloud/v2/blocks/${block}`)
            .then(r => { if (r.data?.timestamp) setValidityTimes(prev => ({ ...prev, [key]: format(new Date(r.data.timestamp * 1000), 'MM/dd/yyyy hh:mm:ss aa') })); })
            .catch(() => {});
        };
        if (t['confirmed-round']) fetchBlockTime(t['confirmed-round'], 'confirmed');
        if (t['first-valid']) fetchBlockTime(t['first-valid'], 'first');
        if (t['last-valid']) fetchBlockTime(t['last-valid'], 'last');

        // Group balance changes
        if (t.group) {
          axios.get(`https://mainnet-idx.algonode.cloud/v2/transactions?group-id=${encodeURIComponent(t.group)}`)
            .then(r => {
              const txs: any[] = r.data.transactions || [];
              const acc: Record<string, any> = {};

              txs.forEach((gtx: any) => {
                const s = gtx.sender;
                if (!acc[s]) acc[s] = { address: s, algoChange: 0, assetChanges: {}, innerTxs: [] };

                if (gtx['tx-type'] === 'pay') {
                  const amt = gtx['payment-transaction'].amount || 0;
                  const rv = gtx['payment-transaction'].receiver;
                  acc[s].algoChange -= amt;
                  acc[s].innerTxs.push({ to: rv, algoAmt: amt, assetAmt: null });
                  if (!acc[rv]) acc[rv] = { address: rv, algoChange: 0, assetChanges: {}, innerTxs: [] };
                  acc[rv].algoChange += amt;
                } else if (gtx['tx-type'] === 'axfer') {
                  const amt = gtx['asset-transfer-transaction'].amount || 0;
                  const aid = String(gtx['asset-transfer-transaction']['asset-id']);
                  const rv = gtx['asset-transfer-transaction'].receiver;
                  acc[s].assetChanges[aid] = (acc[s].assetChanges[aid] || 0) - amt;
                  acc[s].innerTxs.push({ to: rv, algoAmt: null, assetAmt: amt, assetId: aid });
                  if (!acc[rv]) acc[rv] = { address: rv, algoChange: 0, assetChanges: {}, innerTxs: [] };
                  acc[rv].assetChanges[aid] = (acc[rv].assetChanges[aid] || 0) + amt;
                }
              });

              const result = Object.values(acc)
                .map((a: any) => ({
                  address: a.address,
                  algoChange: a.algoChange,
                  assetChanges: Object.keys(a.assetChanges).map(aid => ({ assetId: aid, amount: a.assetChanges[aid] })).filter(x => x.amount !== 0),
                  innerTxs: a.innerTxs,
                }))
                .filter(a => a.algoChange !== 0 || a.assetChanges.length > 0);

              setGroupBalanceChanges(result);

              // Fetch asset info for all unique asset IDs in the group
              const allAssetIds = new Set<string>();
              result.forEach((a: any) => a.assetChanges.forEach((ac: any) => allAssetIds.add(ac.assetId)));
              allAssetIds.forEach(aid => {
                if (!assetInfoCache[aid]) {
                  axios.get(`https://mainnet-idx.algonode.cloud/v2/assets/${aid}`)
                    .then(res => {
                      const p = res.data?.asset?.params;
                      if (p) {
                        setAssetInfoCache(prev => ({
                          ...prev,
                          [aid]: {
                            name: p['unit-name'] || p.name || `ASA ${aid}`,
                            decimals: p.decimals || 0,
                            logoUrl: `https://asa-list.tinyman.org/assets/${aid}/icon.png`
                          }
                        }));
                      }
                    })
                    .catch(() => {
                      setAssetInfoCache(prev => ({
                        ...prev,
                        [aid]: { name: `ASA ${aid}`, decimals: 0, logoUrl: `https://asa-list.tinyman.org/assets/${aid}/icon.png` }
                      }));
                    });
                }
              });
            })
            .catch(() => {});
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
    if (tx['tx-type'] === 'pay')
      return <span className="flex items-center gap-1">{((tx['payment-transaction']?.amount || 0) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 6 })} <AlgoIcon /></span>;
    if (tx['tx-type'] === 'axfer') {
      const amount = tx['asset-transfer-transaction']?.amount || 0;
      const assetId = tx['asset-transfer-transaction']?.['asset-id'];
      let formatted = amount.toLocaleString();
      let name = `ASA ${assetId}`;
      if (assetDetails) {
        formatted = assetDetails.decimals > 0
          ? (amount / Math.pow(10, assetDetails.decimals)).toLocaleString(undefined, { maximumFractionDigits: assetDetails.decimals })
          : amount.toLocaleString();
        name = assetDetails.name;
      }
      return <>{formatted}{' '}<Link href={`/asset/${assetId}`} className="text-[#1b72e8] hover:underline">{name}</Link></>;
    }
    return '0';
  };

  const blockBadge = (block: number | string) => (
    <span className="inline-flex items-center gap-1 ml-2 text-[11px] font-mono bg-[#1b72e8]/10 text-[#1b72e8] border border-[#1b72e8]/20 px-2 py-0.5 rounded">
      Block #{block}
    </span>
  );

  const fmtAlgo = (microAlgo: number) => (microAlgo / 1e6).toFixed(6);

  return (
    <div className="bg-[#f8f9fa] dark:bg-dark min-h-[calc(100vh-140px)] -mt-4 -mx-4 sm:-mx-6 lg:-mx-8">
      <NextSeo title={`Transaction ${id} - euro.algo Explorer`} description="Algorand Transaction Details" />

      <div className="mx-auto max-w-[1200px] w-full p-4 sm:p-6 lg:p-8">
        {/* Back */}
        <div className="mb-6 flex items-center gap-4">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 p-2 rounded-sm shadow-sm">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>
          <h1 className="text-2xl font-light text-gray-800 dark:text-white">Transaction Details</h1>
        </div>

        {loading && <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 p-10 shadow-sm rounded-sm text-center text-gray-400">Loading transaction…</div>}
        {error && !loading && <div className="bg-white dark:bg-[#111827] border border-red-200 dark:border-red-900/30 p-10 shadow-sm rounded-sm text-center text-red-500">{error}</div>}

        {tx && !loading && (
          <div className="space-y-4">

            {/* ── For non-appl: generic card ── */}
            {tx['tx-type'] !== 'appl' && (
              <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 shadow-sm rounded-sm overflow-hidden">
                <div className="border-b border-gray-100 dark:border-gray-800 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/30 dark:bg-gray-800/10">
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400/60 dark:text-gray-500 mb-1">Transaction ID</div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-mono font-bold text-white break-all">{tx.id}</div>
                      <button
                        onClick={copyTxId}
                        title="Copy Transaction ID"
                        className="shrink-0 p-1 rounded hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                      >
                        {copied
                          ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        }
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <span className="bg-blue-50 text-[#1b72e8] dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1 rounded text-[11px] font-semibold uppercase tracking-wide border border-blue-100 dark:border-blue-800/50">{getTxTypeLabel(tx['tx-type'])}</span>
                    <span className="bg-green-50 text-[#3fc15d] dark:bg-green-900/30 dark:text-green-400 px-3 py-1 rounded text-[11px] font-semibold uppercase border border-green-100 dark:border-green-800/50 flex items-center gap-1">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>Confirmed
                    </span>
                  </div>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-800/70">
                  <TxRow label="Sender"><Link href={`/address/${tx.sender}`} className="font-mono text-[#1b72e8] hover:underline break-all">{renderAddress(tx.sender, nfdCache)}</Link></TxRow>
                  {(tx['payment-transaction']?.receiver || tx['asset-transfer-transaction']?.receiver) && (
                    <TxRow label="Receiver"><Link href={`/address/${tx['payment-transaction']?.receiver || tx['asset-transfer-transaction']?.receiver}`} className="font-mono text-[#1b72e8] hover:underline break-all">{renderAddress(tx['payment-transaction']?.receiver || tx['asset-transfer-transaction']?.receiver, nfdCache)}</Link></TxRow>
                  )}
                  <TxRow label="Amount">{renderAmount()}</TxRow>
                  <TxRow label="Confirmed">
                    <span className="text-gray-300">
                      {validityTimes.confirmed || (tx['round-time'] ? format(new Date(tx['round-time'] * 1000), 'MM/dd/yyyy hh:mm:ss aa') : '...')}
                    </span>
                    {blockBadge(tx['confirmed-round'])}
                  </TxRow>
                  <TxRow label="Valid From">
                    <span className="text-gray-400">{validityTimes.first || '...'}</span>
                    {blockBadge(tx['first-valid'])}
                  </TxRow>
                  <TxRow label="Valid Until">
                    <span className="text-gray-400">{validityTimes.last || '...'}</span>
                    {blockBadge(tx['last-valid'])}
                  </TxRow>
                  <TxRow label="Validity Duration">{tx['last-valid'] - tx['first-valid']} blocks</TxRow>
                  <TxRow label="Transaction Fee"><span className="font-mono flex items-center gap-1">{(tx.fee / 1e6).toFixed(6)} <AlgoIcon /></span></TxRow>
                  {tx.group && (
                    <TxRow label="Group"><span className="font-mono text-[#1b72e8] text-[12px] break-all">Group #{tx.group}</span></TxRow>
                  )}
                  {tx.note && <TxRow label="Note"><span className="font-mono text-[12px] text-gray-500 dark:text-gray-400 break-all">{Buffer.from(tx.note, 'base64').toString('utf8')}</span></TxRow>}
                </div>
              </div>
            )}

            {/* ── For appl: CURRENT TRANSACTION card ── */}
            {tx['tx-type'] === 'appl' && (
              <div className="bg-[#0f172a] border border-gray-800 shadow-xl rounded-lg overflow-hidden">
                {/* Card header — Transaction ID */}
                <div className="flex items-start gap-4 px-5 py-4 border-b border-gray-800">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-1">Transaction ID</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[13px] font-bold text-white break-all leading-relaxed">{tx.id}</span>
                      <button
                        onClick={copyTxId}
                        title="Copy Transaction ID"
                        className="shrink-0 p-1 rounded hover:bg-white/10 transition-colors text-gray-500 hover:text-white"
                      >
                        {copied
                          ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        }
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0 mt-0.5">
                    <span className="bg-blue-900/30 text-blue-300 px-2.5 py-0.5 rounded text-[11px] font-semibold uppercase border border-blue-800/50">{getTxTypeLabel(tx['tx-type'])}</span>
                    <span className="bg-green-900/30 text-green-400 px-2.5 py-0.5 rounded text-[11px] font-semibold uppercase border border-green-800/50 flex items-center gap-1">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>Confirmed
                    </span>
                  </div>
                </div>


                {/* Field rows */}
                <TxRow label="Sent By">
                  <Link href={`/address/${tx.sender}`} className="font-mono text-[#1b72e8] hover:underline">{short(tx.sender)}</Link>
                </TxRow>
                <TxRow label="Application Called">
                  <span className="font-mono text-[#1b72e8]">App #{tx['application-transaction']?.['application-id']}</span>
                </TxRow>
                <TxRow label="Confirmed">
                  <span className="text-gray-300">
                    {validityTimes.confirmed || (tx['round-time'] ? format(new Date(tx['round-time'] * 1000), 'MM/dd/yyyy hh:mm:ss aa') : '...')}
                  </span>
                  {blockBadge(tx['confirmed-round'])}
                </TxRow>
                <TxRow label="Valid From">
                  <span className="text-gray-400">{validityTimes.first || '...'}</span>
                  {blockBadge(tx['first-valid'])}
                </TxRow>
                <TxRow label="Valid Until">
                  <span className="text-gray-400">{validityTimes.last || '...'}</span>
                  {blockBadge(tx['last-valid'])}
                </TxRow>
                <TxRow label="Validity Duration">
                  <span className="text-gray-300">{tx['last-valid'] - tx['first-valid']} blocks</span>
                </TxRow>
                <TxRow label="Transaction Fee">
                  <span className="font-mono text-gray-300 flex items-center gap-1">{(tx.fee / 1e6).toFixed(3)} <span className="text-gray-500 text-xs"><AlgoIcon /></span></span>
                </TxRow>
                {tx.group && (
                  <TxRow label="Group">
                    <span className="font-mono text-[#1b72e8] text-[12px] break-all">Group #{tx.group}</span>
                  </TxRow>
                )}
                {tx.note && (
                  <TxRow label="Note">
                    <span className="font-mono text-[12px] text-gray-400 break-all">{Buffer.from(tx.note, 'base64').toString('utf8')}</span>
                  </TxRow>
                )}
              </div>
            )}

            {/* ── GROUP BALANCE CHANGE card ── */}
            {groupBalanceChanges.length > 0 && (
              <div className="bg-[#0f172a] border border-gray-800 shadow-xl rounded-lg overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  <h2 className="text-[13px] font-bold uppercase tracking-widest text-gray-200">Group Balance Change</h2>
                </div>

                <div className="divide-y divide-gray-800/60">
                  {groupBalanceChanges.map((acc, idx) => (
                    <div key={idx} className="px-5 py-4">
                      {/* Account header row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Link href={`/address/${acc.address}`} className="font-mono text-[13px] text-[#4ade80] hover:underline" title={acc.address}>
                            {renderAddress(acc.address, nfdCache).length > 25 ? short(acc.address) : renderAddress(acc.address, nfdCache)}
                          </Link>
                          <span className="text-[9px] bg-gray-800 text-gray-500 border border-gray-700 px-1.5 py-0.5 rounded uppercase font-bold tracking-tight">Regular Account</span>
                        </div>
                        <div className="flex items-center gap-3 text-[12px] font-mono font-bold">
                          {acc.algoChange !== 0 && (
                            <span className={acc.algoChange > 0 ? 'text-[#4ade80]' : 'text-[#f43f5e]'}>
                              {acc.algoChange > 0 ? '+' : ''}{fmtAlgo(acc.algoChange)} <AlgoIcon />
                            </span>
                          )}
                          {acc.assetChanges.map((ac: any) => {
                            const info = assetInfoCache[ac.assetId];
                            const decimals = info?.decimals || 0;
                            const formatted = decimals > 0
                              ? (ac.amount / Math.pow(10, decimals)).toLocaleString(undefined, { maximumFractionDigits: decimals })
                              : ac.amount.toLocaleString();
                            return (
                              <span key={ac.assetId} className={cn('flex items-center gap-1.5', ac.amount > 0 ? 'text-[#4ade80]' : 'text-[#f43f5e]')}>
                                {ac.amount > 0 ? '+' : ''}{formatted}
                                {info?.name && <span className="text-[10px] text-gray-400 font-normal">{info.name}</span>}
                                <img
                                  src={info?.logoUrl || `https://asa-list.tinyman.org/assets/${ac.assetId}/icon.png`}
                                  alt={info?.name || `ASA ${ac.assetId}`}
                                  className="inline-block w-4 h-4 rounded-full"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Simplified account row - removed innerTxs as requested */}
                    </div>
                  ))}
                </div>
              </div>
            )}

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
