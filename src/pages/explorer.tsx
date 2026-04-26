import React, { useState, useEffect } from 'react';
import type { NextPageWithLayout } from '@/types';
import { NextSeo } from 'next-seo';
import RootLayout from '@/layouts/_root-layout';
import Button from '@/components/ui/button';
import axios from 'axios';
import { format, startOfYear, differenceInMonths, subYears, subMonths } from 'date-fns';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import Link from 'next/link';
import { AlgoIcon } from "@/components/icons/algo-icon";

const mockChartData = [
  { time: '29 Mar', txs: 40000 },
  { time: '30 Mar', txs: 180000 },
  { time: '31 Mar', txs: 50000 },
  { time: '01 Apr', txs: 160000 },
  { time: '02 Apr', txs: 60000 },
  { time: '03 Apr', txs: 150000 },
  { time: '04 Apr', txs: 80000 },
];

const globalAssetCache: Record<number, { name: string, decimals: number }> = {};
const fetchingAssets = new Set<number>();

const globalNfdCache: Record<string, string> = {};
const fetchingNfds = new Set<string>();

const renderAddress = (address: string, nfdCache: Record<string, string>) => {
  if (!address) return 'N/A...';
  const nfd = nfdCache[address];
  return nfd ? nfd : `${address.substring(0, 15)}...`;
};

const getTxTokenInfo = (tx: any, assetCache: Record<number, { name: string, decimals: number }>) => {
  if (tx['tx-type'] === 'pay') {
    return { amount: ((tx['payment-transaction']?.amount || 0) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 4 }), token: <AlgoIcon />, assetId: 0 };
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

const getTxTypeLabel = (type: string) => {
  switch (type) {
    case 'pay': return 'Payment';
    case 'axfer': return 'Asset Xfer';
    case 'appl': return 'App Call';
    case 'acfg': return 'Asset Config';
    case 'afrz': return 'Asset Freeze';
    case 'keyreg': return 'Key Reg';
    default: return type ? type.toUpperCase() : 'UNKNOWN';
  }
};

const getTxTypeColors = (type: string) => {
  switch (type) {
    case 'appl': return { label: 'text-purple-400', bg: 'bg-purple-500', border: 'border-purple-700/40' };
    case 'pay':  return { label: 'text-emerald-400', bg: 'bg-emerald-500', border: 'border-emerald-700/40' };
    case 'axfer': return { label: 'text-orange-400', bg: 'bg-orange-500', border: 'border-orange-700/40' };
    default:     return { label: 'text-gray-400',   bg: 'bg-gray-500',   border: 'border-gray-700/40' };
  }
};

const ExplorerPage: NextPageWithLayout = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [searchType, setSearchType] = useState<'tx' | 'address'>('tx');
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [assetCache, setAssetCache] = useState<Record<number, { name: string, decimals: number }>>(globalAssetCache);
  const [nfdCache, setNfdCache] = useState<Record<string, string>>(globalNfdCache);

  const [globalStats, setGlobalStats] = useState({
    price: 0,
    priceChange: 0,
    marketCap: 0,
    circulatingSupply: 0,
    lastBlock: 0,
    volume24h: 0,
    ath: 0,
    onlineStake: 0,
    algoBtc: 0,
    tps: 0,
    blockSpeed: 3.3,
    accounts: 34125000,
    txCost: 0.001,
    recentBlocks: [] as any[]
  });
  const [chartData, setChartData] = useState<any[]>([]);

  const [chartFilter, setChartFilter] = useState('1W');

  useEffect(() => {
    let lastWsUpdate = 0;
    let lastHttpUpdate = 0;
    let prevRound = 0;
    
    const fetchStats = async () => {
      try {
        const [statusRes, supplyRes, btcRes] = await Promise.all([
          axios.get('https://mainnet-api.algonode.cloud/v2/status').catch(() => null),
          axios.get('https://mainnet-api.algonode.cloud/v2/ledger/supply').catch(() => null),
          axios.get('https://api.binance.com/api/v3/ticker/price?symbol=ALGOBTC').catch(() => null)
        ]);
        
        let currentPrice = 0;
        let priceChange = 0;
        const circulatingSupply = 8245000000;
        
        try {
          const [binanceRes, cgRes, coinbaseRes, vestigeRes] = await Promise.allSettled([
            axios.get('https://api.binance.com/api/v3/ticker/price?symbol=ALGOUSDT', { timeout: 2500 }),
            axios.get('https://api.coingecko.com/api/v3/simple/price?ids=algorand&vs_currencies=usd&include_24hr_change=true', { timeout: 2500 }),
            axios.get('https://api.coinbase.com/v2/prices/ALGO-USD/spot', { timeout: 2500 }),
            axios.get('https://free-api.vestige.fi/currency/USD/prices/simple/7D', { timeout: 2500 })
          ]);

          if (binanceRes.status === 'fulfilled' && binanceRes.value?.data?.price) {
            const parsedPrice = parseFloat(binanceRes.value.data.price);
            if (!isNaN(parsedPrice)) currentPrice = parsedPrice;
          } else if (cgRes.status === 'fulfilled' && cgRes.value?.data?.algorand?.usd) {
            currentPrice = cgRes.value.data.algorand.usd;
            priceChange = cgRes.value.data.algorand.usd_24h_change || priceChange;
          } else if (coinbaseRes.status === 'fulfilled' && coinbaseRes.value?.data?.data?.amount) {
            const parsedPrice = parseFloat(coinbaseRes.value.data.data.amount);
            if (!isNaN(parsedPrice)) currentPrice = parsedPrice;
          } else if (vestigeRes.status === 'fulfilled' && Array.isArray(vestigeRes.value?.data) && vestigeRes.value.data.length > 0) {
            const lastItem = vestigeRes.value.data[vestigeRes.value.data.length - 1];
            if (lastItem && lastItem.price) {
              currentPrice = lastItem.price;
            }
          }
        } catch (e) {}

        setGlobalStats(prev => {
          const finalPrice = (currentPrice === 0 && prev.price && prev.price !== 0) ? prev.price : currentPrice;
          return {
            ...prev,
            price: finalPrice,
            priceChange: (priceChange === 0 && prev.priceChange !== 0) ? prev.priceChange : priceChange,
            marketCap: finalPrice * circulatingSupply,
            circulatingSupply: circulatingSupply,
            volume24h: 42500000, 
            ath: 3.28,
            onlineStake: supplyRes?.data?.['online-stake'] ? supplyRes.data['online-stake'] / 1e6 : prev.onlineStake,
            algoBtc: btcRes?.data?.price ? parseFloat(btcRes.data.price) : prev.algoBtc
          };
        });
        
        if (statusRes) {
          const lastRound = statusRes.data['last-round'];
          setGlobalStats(prev => ({
            ...prev,
            lastBlock: lastRound
          }));

          // Fetch last 50 blocks for recent blocks list
          const blocksToFetch = Array.from({length: 50}, (_, i) => lastRound - 49 + i);
          const blockPromises = blocksToFetch.map(round => 
             axios.get(`https://mainnet-api.algonode.cloud/v2/blocks/${round}`).catch(() => null)
          );
          const blocksRes = await Promise.all(blockPromises);
          
          const recentBlocks = blocksRes.slice(-50).reverse().map(res => ({
            round: res?.data?.block?.rnd,
            proposer: res?.data?.block?.proposeroffset ? 'Multiple' : (res?.data?.block?.earn ? 'Fee Sink' : 'Unknown'),
            txns: res?.data?.block?.txns?.length || 0,
            timestamp: res?.data?.block?.ts
          }));

          // Fetch current and block from 100 rounds ago for stable metrics
          const [currentBlockRes, oldBlockRes] = await Promise.all([
            axios.get(`https://mainnet-api.algonode.cloud/v2/blocks/${lastRound}`).catch(() => null),
            axios.get(`https://mainnet-api.algonode.cloud/v2/blocks/${lastRound - 100}`).catch(() => null)
          ]);

          let stableTps = 0;
          let stableBlockSpeed = 3.3;

          if (currentBlockRes?.data?.block && oldBlockRes?.data?.block) {
            const timeDiff = currentBlockRes.data.block.ts - oldBlockRes.data.block.ts;
            const txDiff = currentBlockRes.data.block.tc - oldBlockRes.data.block.tc;
            if (timeDiff > 0) {
              stableBlockSpeed = parseFloat((timeDiff / 100).toFixed(2));
              stableTps = parseFloat((txDiff / timeDiff).toFixed(1));
            }
          }

          setGlobalStats(prev => ({ 
            ...prev, 
            recentBlocks,
            tps: stableTps,
            blockSpeed: stableBlockSpeed
          }));
        }
      } catch (e) {
        console.error("Failed to fetch global stats", e);
      }
    };

    fetchStats();
    const statsUpdateInterval = setInterval(fetchStats, 30000);

    const fetchChartData = async (filter: string, currentRound: number) => {
      try {
        let points = 6;
        let blocksPerPoint = 0;
        const blocksPerDay = 26181;

        switch(filter) {
          case '24H': blocksPerPoint = Math.floor(blocksPerDay / 6); break;
          case '1D': blocksPerPoint = blocksPerDay; points = 2; break; // today vs yesterday
          case '5D': blocksPerPoint = blocksPerDay; points = 6; break;
          case '1W': blocksPerPoint = blocksPerDay; points = 8; break;
          case '1M': blocksPerPoint = blocksPerDay * 3; points = 11; break;
          default: blocksPerPoint = blocksPerDay;
        }

        const roundsToFetch = Array.from({length: points}, (_, i) => currentRound - (points - 1 - i) * blocksPerPoint);
        const blockRes = await Promise.all(roundsToFetch.map(r => 
           axios.get(`https://mainnet-api.algonode.cloud/v2/blocks/${r}`).catch(() => null)
        ));

        const tcs = blockRes.map(res => res?.data?.block?.tc || 0);
        const newChartData: any[] = [];
        for (let i = 1; i < tcs.length; i++) {
           if (tcs[i] > 0 && tcs[i-1] > 0) {
              const diff = tcs[i] - tcs[i-1];
              const date = new Date(Date.now() - (tcs.length - 1 - i) * (blocksPerPoint * 3.3 * 1000));
              newChartData.push({
                 time: format(date, filter === '24H' ? 'HH:mm' : 'dd MMM'),
                 txs: diff
              });
           }
        }
        
        if (newChartData.length > 0) {
           setChartData(newChartData);
        }
      } catch (e) {}
    };

    const fetchTransactions = async () => {
      try {
        const statusRes = await axios.get('https://mainnet-api.algonode.cloud/v2/status');
        const lastRound = statusRes.data['last-round'];
        const txRes = await axios.get(`https://mainnet-idx.algonode.cloud/v2/transactions?min-round=${lastRound - 10}&limit=100`);
        if (txRes.data && txRes.data.transactions) {
          const sortedTxs = txRes.data.transactions.sort((a: any, b: any) => b['round-time'] - a['round-time']);
          setRecentTransactions(sortedTxs);

          sortedTxs.forEach((tx: any) => {
             if (tx['tx-type'] === 'axfer') {
                const assetId = tx['asset-transfer-transaction']?.['asset-id'];
                if (assetId && !globalAssetCache[assetId] && !fetchingAssets.has(assetId)) {
                   fetchingAssets.add(assetId);
                   axios.get(`https://mainnet-idx.algonode.cloud/v2/assets/${assetId}`).then(res => {
                      const params = res.data?.asset?.params;
                      if (params) {
                         globalAssetCache[assetId] = { 
                            name: params['unit-name'] || params.name || `ASA ${assetId}`, 
                            decimals: params.decimals || 0 
                         };
                         setAssetCache({ ...globalAssetCache });
                      }
                   }).catch(() => {
                      globalAssetCache[assetId] = { name: `ASA ${assetId}`, decimals: 0 };
                      setAssetCache({ ...globalAssetCache });
                   });
                }
             }
          });

          // Fetch NFDs for top transactions
          const topTxs = sortedTxs.slice(0, 10);
          const addressesToFetch = new Set<string>();
          topTxs.forEach((tx: any) => {
             const sender = tx.sender;
             const receiver = tx['payment-transaction']?.receiver || tx['asset-transfer-transaction']?.receiver;
             
             if (sender && globalNfdCache[sender] === undefined && !fetchingNfds.has(sender)) addressesToFetch.add(sender);
             if (receiver && globalNfdCache[receiver] === undefined && !fetchingNfds.has(receiver)) addressesToFetch.add(receiver);
          });

          if (addressesToFetch.size > 0) {
             const url = `https://api.nf.domains/nfd/lookup?` + Array.from(addressesToFetch).map(a => `address=${a}`).join('&');
             addressesToFetch.forEach(a => fetchingNfds.add(a));
             axios.get(url).then(res => {
                Object.keys(res.data).forEach(addr => {
                   globalNfdCache[addr] = res.data[addr].name;
                });
                addressesToFetch.forEach(addr => {
                   if (globalNfdCache[addr] === undefined) globalNfdCache[addr] = ''; 
                });
                setNfdCache({ ...globalNfdCache });
             }).catch(() => {
                addressesToFetch.forEach(addr => { globalNfdCache[addr] = ''; });
                setNfdCache({ ...globalNfdCache });
             });
          }
        }
      } catch (e) {
        console.error("Failed to fetch recent transactions", e);
      }
    };
    
    fetchStats();
    fetchTransactions();
    
    // Chart is handled by its own useEffect below
    
    const statsInterval = setInterval(async () => {
      try {
        const statusRes = await axios.get('https://mainnet-api.algonode.cloud/v2/status').catch(() => null);

        let fallbackPrice: number | null = null;
        let fallbackChange: number | null = null;

        if (Date.now() - lastWsUpdate > 6000 && Date.now() - lastHttpUpdate > 15000) {
          lastHttpUpdate = Date.now();
          
          try {
            // Priority 1: Binance HTTP (Huge rate limit: 1200 req/min)
            const binanceRes = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=ALGOUSDT&t=${Date.now()}`, { timeout: 2500 });
            if (binanceRes.data?.price) {
               fallbackPrice = parseFloat(binanceRes.data.price);
            } else { throw new Error('Binance failed'); }
          } catch(e) {
            try {
              // Priority 2: Coinbase
              const coinbaseRes = await axios.get(`https://api.coinbase.com/v2/prices/ALGO-USD/spot?t=${Date.now()}`, { timeout: 2500 });
              if (coinbaseRes.data?.data?.amount) {
                fallbackPrice = parseFloat(coinbaseRes.data.data.amount);
              } else { throw new Error('Coinbase failed'); }
            } catch(e2) {
              try {
                // Priority 3: Coingecko (Strict rate limit)
                const cgRes = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=algorand&vs_currencies=usd&include_24hr_change=true&t=${Date.now()}`, { timeout: 3500 });
                if (cgRes?.data?.algorand?.usd) {
                  fallbackPrice = cgRes.data.algorand.usd;
                  fallbackChange = cgRes.data.algorand.usd_24h_change;
                }
              } catch (e3) {}
            }
          }
        }

        if (statusRes) {
           const newRound = statusRes.data['last-round'];
            if (newRound > prevRound) {
               prevRound = newRound;
               setGlobalStats(prev => ({
                  ...prev,
                  lastBlock: newRound
               }));
            }
        }

        setGlobalStats(prev => {
          return {
            ...prev,
            ...(fallbackPrice !== null && { price: fallbackPrice }),
            ...(fallbackChange !== null && { priceChange: fallbackChange }),
            ...(fallbackPrice !== null && { marketCap: fallbackPrice * 8245000000 })
          };
        });
      } catch (e) {}
    }, 4000);

    // WEBSOCKET FOR PRICE (Auto-reconnecting)
    let ws: WebSocket | null = null;
    let wsReconnectTimer: any;

    const connectWebSocket = () => {
      try {
        ws = new WebSocket('wss://stream.binance.com:9443/ws/algousdt@ticker');
        ws.onmessage = (event) => {
          lastWsUpdate = Date.now();
          try {
            const data = JSON.parse(event.data);
            if (data && data.c) {
              const livePrice = parseFloat(data.c);
              const liveChange = parseFloat(data.P);
              if (!isNaN(livePrice)) {
                setGlobalStats(prev => ({
                  ...prev,
                  price: livePrice,
                  priceChange: isNaN(liveChange) ? prev.priceChange : liveChange,
                  marketCap: livePrice * 8245000000,
                  circulatingSupply: 8245000000,
                  volume24h: 42500000,
                  ath: 3.28
                }));
              }
            }
          } catch (err) {}
        };
        ws.onclose = () => {
          wsReconnectTimer = setTimeout(connectWebSocket, 3000);
        };
      } catch (err) {
        console.warn("WebSocket failed", err);
      }
    };

    connectWebSocket();

    const txInterval = setInterval(() => {
      fetchTransactions();
    }, 4000);
    
    return () => {
      clearInterval(statsInterval);
      clearInterval(txInterval);
      clearInterval(statsUpdateInterval);
      if (ws) ws.close();
      clearTimeout(wsReconnectTimer);
    };
  }, []);

  useEffect(() => {
    if (globalStats.lastBlock > 0) {
      const fetchChartData = async (filter: string, currentRound: number) => {
        try {
          let points = 6;
          let blocksPerPoint = 0;
          const blocksPerDay = 26181;

          switch(filter) {
            case '24H': blocksPerPoint = Math.floor(blocksPerDay / 24); points = 25; break;
            case '1W': blocksPerPoint = Math.floor(blocksPerDay / 2); points = 15; break;
            case '1M': blocksPerPoint = blocksPerDay; points = 31; break;
            case '6M': blocksPerPoint = blocksPerDay * 6; points = 31; break;
            case '1Y': blocksPerPoint = Math.floor(blocksPerDay * 30.5); points = 13; break;
            case 'YTD': {
               const months = differenceInMonths(new Date(), startOfYear(new Date())) + 1;
               blocksPerPoint = Math.floor(blocksPerDay * 6); 
               points = (months * 5) + 1;
               break;
            }
            case 'ALL': {
               const startYear = 2018;
               const currentYear = new Date().getFullYear();
               points = (currentYear - startYear) + 1;
               blocksPerPoint = Math.floor(blocksPerDay * 365.25);
               break;
            }
            default: blocksPerPoint = blocksPerDay;
          }

          const roundsToFetch = Array.from({length: points}, (_, i) => {
             const r = currentRound - (points - 1 - i) * blocksPerPoint;
             return r < 0 ? 0 : r;
          });
          const blockRes = await Promise.all(roundsToFetch.map(r => 
             axios.get(`https://mainnet-api.algonode.cloud/v2/blocks/${r}`).catch(() => null)
          ));

          const tcs = blockRes.map(res => res?.data?.block?.tc || 0);
          const newChartData: any[] = [];
          for (let i = 1; i < tcs.length; i++) {
             if (tcs[i] > 0 && tcs[i-1] > 0) {
                const diff = tcs[i] - tcs[i-1];
                let timeLabel = '';
                if (filter === '24H') timeLabel = format(new Date(Date.now() - (tcs.length - 1 - i) * (blocksPerPoint * 3.3 * 1000)), 'HH:mm');
                else if (filter === '1W') {
                   const d = new Date(Date.now() - (tcs.length - 1 - i) * (blocksPerPoint * 3.3 * 1000));
                   timeLabel = format(d, 'dd MMM');
                }
                else if (filter === 'ALL') timeLabel = (2018 + i).toString();
                else if (filter === '1Y') {
                   const d = subMonths(new Date(), tcs.length - 1 - i);
                   timeLabel = format(d, 'MMM') + (filter === '1Y' && i === 1 ? (" '" + format(d, 'yy')) : "");
                }
                else timeLabel = format(new Date(Date.now() - (tcs.length - 1 - i) * (blocksPerPoint * 3.3 * 1000)), 'dd MMM');
                
                newChartData.push({
                   time: timeLabel,
                   txs: diff
                });
             }
          }
          
          if (newChartData.length > 0) {
             setChartData(newChartData);
          }
        } catch (e) {}
      };
      fetchChartData(chartFilter, globalStats.lastBlock);
    }
  }, [chartFilter, globalStats.lastBlock]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      let data = null;
      if (searchType === 'tx') {
        const response = await axios.get(`https://mainnet-idx.algonode.cloud/v2/transactions/${query}`);
        data = response.data.transaction;
      } else {
        const response = await axios.get(`https://mainnet-idx.algonode.cloud/v2/accounts/${query}`);
        data = response.data.account;
      }
      setResult(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'No data found. Please make sure you entered a valid ID/Address.');
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-[#1f2937] border border-gray-100 dark:border-gray-800 p-2.5 shadow-xl rounded-sm text-[11px]">
        <p className="font-bold text-gray-800 dark:text-white mb-1">{label}</p>
        <p className="text-[#1b72e8] flex items-center gap-1.5">
          <span className="font-medium text-gray-500 dark:text-gray-400 uppercase tracking-tight">Transactions:</span>
          <span className="font-bold">{payload[0].value.toLocaleString()}</span>
        </p>
      </div>
    );
  }
  return null;
};

const formatNumber = (num: number) => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toLocaleString();
  };

  return (
    <div className="bg-[#f8f9fa] dark:bg-dark min-h-[calc(100vh-140px)] -mt-4 -mx-4 sm:-mx-6 lg:-mx-8">
      <NextSeo title="euro.algo Explorer" description="Algorand Blockchain Explorer" />
      
      <div className="mx-auto max-w-[1400px] w-full p-4 sm:p-6 lg:p-8">
        
        {/* TOP STATS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 p-5 shadow-sm rounded-sm">
            <div className="text-gray-500 text-[11px] font-semibold mb-2 uppercase tracking-wider">Latest Block</div>
            <div className="text-3xl font-light text-gray-800 dark:text-white text-center tracking-tight">{globalStats.lastBlock ? globalStats.lastBlock.toLocaleString() : '...'}</div>
          </div>
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 p-5 shadow-sm rounded-sm">
            <div className="text-gray-500 text-[11px] font-semibold mb-2 uppercase tracking-wider flex items-center justify-between">Circulating Supply <span className="bg-gray-100 dark:bg-gray-800 rounded-full w-4 h-4 flex items-center justify-center text-[10px] text-gray-400">i</span></div>
            <div className="text-2xl font-light text-gray-800 dark:text-white text-center flex items-center justify-center gap-1">
              {globalStats.circulatingSupply ? formatNumber(globalStats.circulatingSupply) : '...'} <AlgoIcon />
            </div>
          </div>
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 p-5 shadow-sm rounded-sm">
            <div className="text-gray-500 text-[11px] font-semibold mb-2 uppercase tracking-wider flex items-center justify-between">Total Supply <span className="bg-gray-100 dark:bg-gray-800 rounded-full w-4 h-4 flex items-center justify-center text-[10px] text-gray-400">i</span></div>
            <div className="text-2xl font-light text-gray-800 dark:text-white text-center flex items-center justify-center gap-1">
              10,000,000,000 <AlgoIcon />
            </div>
          </div>
          <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 p-5 shadow-sm rounded-sm">
            <div className="text-gray-500 text-[11px] font-semibold mb-2 uppercase tracking-wider flex items-center justify-between">Online Stake <span className="bg-gray-100 dark:bg-gray-800 rounded-full w-4 h-4 flex items-center justify-center text-[10px] text-gray-400">i</span></div>
            <div className="text-2xl font-light text-gray-800 dark:text-white text-center flex items-center justify-center gap-1">
              {globalStats.onlineStake ? globalStats.onlineStake.toLocaleString() : '1,866,678,541.31'} <AlgoIcon />
            </div>
          </div>
        </div>

        {/* MIDDLE ROW (Left Stats, Middle Stats, Right Chart) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 mb-8 bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 shadow-sm rounded-sm">
          
          {/* Left Panel: Algo Price & Market Cap */}
          <div className="lg:col-span-3 p-6 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-800 flex flex-col justify-between">
            <div>
              <div className="text-gray-500 text-[11px] font-semibold mb-2 uppercase tracking-wider">Algo Price</div>
              <div className="text-gray-400 text-xs mb-4">{globalStats.algoBtc ? globalStats.algoBtc.toFixed(8) : '0.00001942'} BTC</div>
              <div className="flex items-center gap-2 mb-6 mt-6">
                <span className="text-4xl font-light text-gray-800 dark:text-white tracking-tight">${globalStats.price ? globalStats.price.toFixed(4) : '...'}</span>
                {globalStats.priceChange !== 0 && (
                  <span className={`text-sm font-semibold flex items-center ${globalStats.priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {globalStats.priceChange > 0 ? '▲' : '▼'} {Math.abs(globalStats.priceChange).toFixed(2)}%
                  </span>
                )}
              </div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/30 text-center py-2.5 rounded text-[#1b72e8] dark:text-blue-300 text-sm tracking-wide">
              MARKET CAP: <span className="text-gray-800 dark:text-white ml-1 font-semibold">${globalStats.marketCap ? formatNumber(globalStats.marketCap) : '...'}</span>
            </div>
          </div>

          {/* Middle Panel: Speed, TPS, Cost, Accounts */}
          <div className="lg:col-span-3 p-6 border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-gray-800 flex flex-col justify-center">
            <div className="grid grid-cols-2 gap-y-10 gap-x-6">
              <div>
                <div className="text-gray-500 text-[11px] font-semibold mb-2 uppercase tracking-wider flex items-center justify-between">Block Speed <span className="bg-gray-100 dark:bg-gray-800 rounded-full w-4 h-4 flex items-center justify-center text-[10px] text-gray-400">i</span></div>
                <div className="text-xl font-light text-gray-800 dark:text-white flex items-center gap-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1b72e8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                  {globalStats.blockSpeed} sec
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-[11px] font-semibold mb-2 uppercase tracking-wider flex items-center justify-between">TPS <span className="bg-gray-100 dark:bg-gray-800 rounded-full w-4 h-4 flex items-center justify-center text-[10px] text-gray-400">i</span></div>
                <div className="text-xl font-light text-gray-800 dark:text-white flex items-center gap-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1b72e8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg>
                  {globalStats.tps > 0 ? globalStats.tps.toFixed(1) : '...'}
                </div>
              </div>
              <div>
                 <div className="text-gray-500 text-[11px] font-semibold mb-2 uppercase tracking-wider flex items-center justify-between">Tx Cost <span className="bg-gray-100 dark:bg-gray-800 rounded-full w-4 h-4 flex items-center justify-center text-[10px] text-gray-400">i</span></div>
                 <div className="text-xl font-light text-gray-800 dark:text-white flex items-center gap-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1b72e8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="17" y1="3" x2="17" y2="21"></line><path d="M13 17l4 4 4-4"></path><line x1="7" y1="21" x2="7" y2="3"></line><path d="M11 7L7 3 3 7"></path></svg>
                  ${globalStats.price ? (0.001 * globalStats.price).toFixed(5) : '0.00089'}
                </div>
              </div>
              <div>
                <div className="text-gray-500 text-[11px] font-semibold mb-2 uppercase tracking-wider flex items-center justify-between">Accounts <span className="bg-gray-100 dark:bg-gray-800 rounded-full w-4 h-4 flex items-center justify-center text-[10px] text-gray-400">i</span></div>
                <div className="text-xl font-light text-gray-800 dark:text-white flex items-center gap-3">
                  <span className="text-[#1b72e8] font-bold bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded text-sm">A</span> 
                  {globalStats.accounts.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Chart */}
          <div className="lg:col-span-6 p-6 flex flex-col min-h-[250px]">
            <div className="flex justify-between items-center mb-6">
              <div className="text-gray-500 text-[11px] font-semibold uppercase tracking-wider">Transactions History</div>
              <div className="flex gap-1 text-[10px] font-semibold border border-gray-200 dark:border-gray-700 rounded p-0.5">
                {['24H', '1W', '1M', '6M', '1Y', 'YTD', 'ALL'].map(t => (
                  <button 
                    key={t} 
                    onClick={() => setChartFilter(t)}
                    className={`px-2 py-1 rounded-sm transition-colors ${chartFilter === t ? 'bg-blue-50 text-[#1b72e8]' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                  >
                    {t}
                  </button>
                ))}
                <button className="px-2 py-1 text-gray-500">⋮</button>
              </div>
            </div>
            <div className="flex-1 w-full relative">
                {/* Label for y axis */}
                <div className="absolute -left-12 top-1/3 -translate-y-1/2 -rotate-90 text-[10px] text-gray-500 font-semibold tracking-wider origin-center z-10 whitespace-nowrap hidden sm:block">Number of Txs</div>
                <div className="w-full h-full">
                   <ResponsiveContainer width="100%" height="100%">
                     <LineChart data={chartData.length > 0 ? chartData : mockChartData} margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                      <XAxis 
                        dataKey="time" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#9ca3af' }}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#9ca3af' }}
                        tickFormatter={(value) => value >= 1000000 ? `${(value/1000000).toFixed(1)}M` : value >= 1000 ? `${(value/1000).toFixed(0)}K` : value}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="txs" stroke="#1b72e8" strokeWidth={2} dot={{ r: 2, fill: '#1b72e8' }} activeDot={{ r: 4 }} isAnimationActive={true} />
                    </LineChart>
                  </ResponsiveContainer>
               </div>
            </div>
            {/* X-axis labels managed by XAxis component now */}
          </div>
        </div>

        {/* BOTTOM ROW (Latest Blocks & Transactions) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Latest Blocks */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Latest Blocks</h2>
              <button className="text-xs font-semibold text-[#1b72e8] border border-blue-200 bg-white dark:bg-[#111827] px-4 py-1.5 rounded-full hover:bg-blue-50 transition-colors">View all Blocks</button>
            </div>
            <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 shadow-sm rounded-sm max-h-[800px] overflow-y-auto">
              {globalStats.recentBlocks.map((block: any, i: number) => (
                <div key={block.round || i} className="flex items-center p-4 py-5 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="flex flex-col items-center justify-center w-16">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8ba5c9" strokeWidth="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                    <span className="text-[10px] text-blue-400 mt-1">
                      {block.timestamp ? Math.max(0, Math.floor((Date.now() / 1000) - block.timestamp)) : 12 + i * 5} s
                    </span>
                  </div>
                  <div className="flex-1 ml-4">
                    <div className="flex items-center text-[13px] mb-1.5">
                      <span className="text-gray-400 w-36">Round: <span className="text-[#1b72e8] cursor-pointer hover:underline">{block.round?.toLocaleString()}</span></span>
                      <span className="text-gray-400">Proposer: <span className="text-gray-600 dark:text-gray-300">{block.proposer}</span></span>
                    </div>
                    <div className="flex justify-between items-center text-[13px]">
                      <span className="text-gray-400">Transactions: {block.txns}</span>
                      <span className="text-gray-400">Txs: <span className="text-gray-800 dark:text-gray-200 font-semibold ml-1">{block.txns}</span></span>
                    </div>
                  </div>
                </div>
              ))}
              {globalStats.recentBlocks.length === 0 && (
                 <div className="p-8 text-center text-gray-500 text-sm">Loading blocks...</div>
              )}
            </div>
          </div>

          {/* Latest Transactions */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Latest Transactions</h2>
              <button className="text-xs font-semibold text-[#1b72e8] border border-blue-200 bg-white dark:bg-[#111827] px-4 py-1.5 rounded-full hover:bg-blue-50 transition-colors">View all Transactions</button>
            </div>
            <div className="bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-800 shadow-sm rounded-sm max-h-[800px] overflow-y-auto">
              {recentTransactions.slice(0, 50).map((tx: any, i: number) => (
                <div key={tx.id || i} className="flex items-center p-4 py-5 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors relative">
                  
                  {/* Left sideways label */}
                  <div className={`absolute left-0 top-0 bottom-0 w-8 border-r ${getTxTypeColors(tx['tx-type']).border} dark:border-opacity-60 flex items-center justify-center`}>
                    <span className={`text-[9px] ${getTxTypeColors(tx['tx-type']).label} uppercase tracking-widest transform -rotate-90 origin-center whitespace-nowrap w-24 text-center font-semibold`}>{getTxTypeLabel(tx['tx-type'])}</span>
                  </div>

                  <div className="flex flex-col items-center justify-center w-12 ml-8">
                     <div className={`${getTxTypeColors(tx['tx-type']).bg} rounded-full p-1 text-white`}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="13 17 18 12 13 7"></polyline><line x1="6" y1="12" x2="18" y2="12"></line></svg>
                     </div>
                     <span className="text-[10px] text-blue-400 mt-1">
                        {tx['round-time'] ? Math.max(0, Math.floor((Date.now() / 1000) - tx['round-time'])) : '11'} s
                     </span>
                  </div>
                  
                  <div className="flex-1 ml-4 overflow-hidden">
                    <div className="flex justify-between items-center text-[13px] mb-1.5">
                      <span className="text-gray-400 flex items-center gap-1">ID: 
                         <Link href={`/tx/${tx.id}`} className="text-[#1b72e8] truncate w-32 sm:w-48 lg:w-64 inline-block align-bottom cursor-pointer hover:underline">
                            {tx.id}
                         </Link>
                      </span>
                      <span className="text-[#3fc15d] text-xs flex items-center gap-1 font-medium bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded">
                         <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                         {getTxTokenInfo(tx, assetCache).amount}{' '}
                         {getTxTokenInfo(tx, assetCache).assetId > 0 ? (
                            <Link href={`/asset/${getTxTokenInfo(tx, assetCache).assetId}`} className="hover:underline hover:text-[#1b72e8]">
                               {getTxTokenInfo(tx, assetCache).token}
                            </Link>
                         ) : (
                            getTxTokenInfo(tx, assetCache).token
                         )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[13px]">
                       <div className="flex gap-4 text-gray-400">
                          <div className="truncate w-24 sm:w-32">
                             From:{' '}
                             <Link href={`/address/${tx.sender}`} className="text-gray-600 dark:text-gray-300 hover:text-[#1b72e8] dark:hover:text-[#1b72e8] hover:underline" title={tx.sender}>
                                {renderAddress(tx.sender, nfdCache)}
                             </Link>
                          </div>
                          {tx['tx-type'] !== 'appl' && (
                             <div className="truncate w-24 sm:w-32">
                                To:{' '}
                                <Link href={`/address/${tx['payment-transaction']?.receiver || tx['asset-transfer-transaction']?.receiver}`} className="text-gray-600 dark:text-gray-300 hover:text-[#1b72e8] dark:hover:text-[#1b72e8] hover:underline" title={tx['payment-transaction']?.receiver || tx['asset-transfer-transaction']?.receiver}>
                                   {renderAddress(tx['payment-transaction']?.receiver || tx['asset-transfer-transaction']?.receiver, nfdCache)}
                                </Link>
                             </div>
                           )}
                       </div>
                       <div className="text-gray-500 font-medium">
                          Fee: <span className="text-gray-800 dark:text-gray-200 font-bold ml-1 flex items-center gap-1">{(tx.fee / 1e6).toFixed(3)} <AlgoIcon /></span>
                       </div>
                    </div>
                  </div>
                </div>
              ))}
              {recentTransactions.length === 0 && (
                 <div className="p-8 text-center text-gray-500 text-sm">Loading transactions...</div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

ExplorerPage.getLayout = function getLayout(page: any) {
  return <RootLayout>{page}</RootLayout>;
};

export default ExplorerPage;
