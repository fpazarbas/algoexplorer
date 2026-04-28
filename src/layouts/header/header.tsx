import { useRouter } from 'next/router';
import cn from 'classnames';
import { useWindowScroll } from '@/lib/hooks/use-window-scroll';
import { useIsMounted } from '@/lib/hooks/use-is-mounted';
import routes from '@/config/routes';
import { StrictMode, useState, useEffect, useRef } from 'react';
import PeraConnect from '@/data/dynamic/peraConnect';
import { useTheme } from 'next-themes';
import { format } from 'date-fns';

const navLinks = [
  { name: 'Assets', href: '/assets' },
  { name: 'Apps', href: '#' },
  { name: 'Statistics', href: '#' },
  { name: 'Blockchain', href: '#' },
  { name: 'Tools', href: '#' },
  { name: 'DeFi', href: '#' },
];

async function navigateTo(q: string, router: ReturnType<typeof useRouter>) {
  const clean = q.trim();
  if (!clean) return;

  if (/^\d+$/.test(clean)) { router.push(`/asset/${clean}`); return; }
  if (/^[A-Z2-7]{58}$/.test(clean)) { router.push(`/address/${clean}`); return; }

  if (/^[a-z0-9-]+\.algo$/i.test(clean)) {
    try {
      const res = await fetch(`https://api.nf.domains/nfd/${clean.toLowerCase()}`);
      if (res.ok) {
        const data = await res.json();
        const address = data.depositAccount || data.caAlgo?.[0];
        if (address) { router.push(`/address/${address}`); return; }
      }
    } catch {}
    return;
  }

  if (/^[A-Za-z0-9+/]{52}$/.test(clean)) { router.push(`/tx/${clean}`); return; }
  router.push(`/tx/${clean}`);
}

interface SearchResult {
  id: string;
  type: string;
  block?: number;
  timestamp?: number;
  href: string;
  avatar?: string;
}

async function fetchResults(q: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  const clean = q.trim();

  // Asset ID: pure numeric
  if (/^\d+$/.test(clean)) {
    results.push({ id: clean, type: 'ASSET', href: `/asset/${clean}` });
    return results;
  }

  // Algorand address: 58 chars base32
  if (/^[A-Z2-7]{58}$/.test(clean)) {
    results.push({ id: clean, type: 'ADDRESS', href: `/address/${clean}` });
    return results;
  }

  // NFD (Non-Fungible Domain): e.g. name.algo
  if (/^[a-z0-9-]+\.algo$/i.test(clean)) {
    try {
      const res = await fetch(`https://api.nf.domains/nfd/${clean.toLowerCase()}?view=full`);
      if (res.ok) {
        const data = await res.json();
        const address = data.depositAccount || data.caAlgo?.[0];
        const avatar = data.properties?.userDefined?.avatar || undefined;
        if (address) {
          results.push({
            id: `${clean} → ${address.substring(0, 12)}...`,
            type: 'NFD',
            href: `/address/${address}`,
            avatar,
          });
        }
      }
    } catch {}
    return results;
  }

  // Try as tx ID
  try {
    const res = await fetch(`https://mainnet-idx.algonode.cloud/v2/transactions/${clean}`);
    if (res.ok) {
      const data = await res.json();
      const tx = data.transaction;
      results.push({
        id: clean,
        type: (tx['tx-type'] || 'TX').toUpperCase(),
        block: tx['confirmed-round'],
        timestamp: tx['round-time'],
        href: `/tx/${clean}`,
      });
    }
  } catch {}

  return results;
}

export default function Header({ className }: { className?: string }) {
  const router = useRouter();
  const isMounted = useIsMounted();
  const { theme, setTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<any>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); setOpen(false); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      const r = await fetchResults(query);
      setResults(r);
      setOpen(true);
      setLoading(false);
    }, 350);
  }, [query]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setOpen(false);
    await navigateTo(query, router);
  };

  const handleClear = () => { setQuery(''); setResults([]); setOpen(false); };

  const txTypeColor: Record<string, string> = {
    PAY: 'text-emerald-400',
    AXFER: 'text-orange-400',
    APPL: 'text-purple-400',
    ASSET: 'text-blue-400',
    ADDRESS: 'text-cyan-400',
    TX: 'text-gray-400',
    NFD: 'text-cyan-400',
  };

  return (
    <nav className={cn('sticky top-0 z-30 w-full bg-white dark:bg-light-dark shadow-sm transition-all duration-300', className)}>
      <div className="flex h-16 sm:h-20 items-center px-4 sm:px-6 lg:px-8 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center w-full gap-4 lg:gap-8">

          {/* Logo */}
          <div onClick={() => router.push(routes.home)} className="flex flex-col cursor-pointer shrink-0">
            <span className="text-2xl font-bold text-[#1b72e8] dark:text-blue-400 leading-none">euro.algo</span>
            <span className="text-[10px] text-gray-500 font-medium tracking-wide hidden lg:block">Algorand Blockchain Explorer</span>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 items-center ml-2" ref={wrapperRef}>
            <form className="relative w-full" onSubmit={handleSubmit}>
              <div className="flex items-center w-full h-10 px-3 gap-2 rounded-md border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-[#0f1929] focus-within:border-[#1b72e8] dark:focus-within:border-[#1b72e8] transition-all">
                <svg className="text-gray-400 shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => results.length > 0 && setOpen(true)}
                  placeholder="Search address, transaction ID, or asset ID..."
                  className="flex-1 bg-transparent text-sm outline-none border-none text-gray-800 dark:text-gray-100 placeholder-gray-400"
                />
                {query && (
                  <button type="button" onClick={handleClear} className="text-gray-400 hover:text-gray-200 shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </div>

              {/* Dropdown */}
              {open && (
                <div className="absolute top-12 left-0 w-full bg-white dark:bg-[#111827] border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl z-50 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                    Results
                  </div>
                  {loading ? (
                    <div className="px-4 py-4 text-sm text-gray-500">Searching...</div>
                  ) : results.length === 0 ? (
                    <div className="px-4 py-4 text-sm text-gray-500">Not found.</div>
                  ) : (
                    results.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => { setOpen(false); router.push(r.href); }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-start gap-3"
                      >
                        {r.avatar
                          ? <img src={r.avatar} alt="" className="w-6 h-6 rounded-full shrink-0 mt-0.5 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          : <svg className="text-gray-500 mt-0.5 shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                        }
                        <div className="min-w-0">
                          <div className="text-sm text-gray-900 dark:text-white font-mono truncate">{r.id}</div>
                          <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                            <span className={txTypeColor[r.type] || 'text-gray-400'}>{r.type}</span>
                            {r.block && <><span>|</span><span>Block #{r.block.toLocaleString()}</span></>}
                            {r.timestamp && <><span>|</span><span>{format(new Date(r.timestamp * 1000), 'MM/dd/yyyy')}</span></>}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </form>
          </div>

          {/* Navigation Links */}
          <ul className="hidden xl:flex shrink-0 items-center gap-4 2xl:gap-6 text-[13px] font-medium text-gray-600 dark:text-gray-300">
            {navLinks.map((link) => (
              <li key={link.name}>
                <a href={link.href} className="hover:text-[#1b72e8] transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap">
                  {link.name}
                  {['Statistics', 'Blockchain', 'Tools'].includes(link.name) && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><polyline points="6 9 12 15 18 9"/></svg>
                  )}
                </a>
              </li>
            ))}
          </ul>

          {/* Right Area */}
          <div className="flex shrink-0 items-center gap-3 ml-auto">
            <div className="hidden sm:flex px-3 py-1.5 border border-blue-200 text-[#1b72e8] rounded text-xs font-semibold bg-blue-50/50 cursor-pointer hover:bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300">
              MAINNET ▾
            </div>
            <StrictMode><PeraConnect /></StrictMode>
            {isMounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:bg-dark dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle Theme"
              >
                {theme === 'dark' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                )}
              </button>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
}
