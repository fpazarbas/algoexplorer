import { useRouter } from 'next/router';
import cn from 'classnames';
import { useWindowScroll } from '@/lib/hooks/use-window-scroll';
import { useIsMounted } from '@/lib/hooks/use-is-mounted';
import routes from '@/config/routes';
import { StrictMode } from 'react';
import PeraConnect from '@/data/dynamic/peraConnect';
import ActiveLink from '@/components/ui/links/active-link';
import { useTheme } from 'next-themes';

const navLinks = [
  { name: 'Assets', href: '#' },
  { name: 'Apps', href: '#' },
  { name: 'Statistics', href: '#' },
  { name: 'Blockchain', href: '#' },
  { name: 'Tools', href: '#' },
  { name: 'Developer API', href: '#' },
  { name: 'Governance', href: '#' },
];

export default function Header({ className }: { className?: string }) {
  const router = useRouter();
  const isMounted = useIsMounted();
  const windowScroll = useWindowScroll();
  const { theme, setTheme } = useTheme();

  return (
    <nav
      className={cn(
        'sticky top-0 z-30 w-full bg-white dark:bg-light-dark shadow-sm transition-all duration-300',
        className
      )}
    >
      {/* Top Row */}
      <div className="flex h-16 sm:h-20 items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between w-full relative">
          
          {/* Logo */}
          <div
            onClick={() => router.push(routes.home)}
            className="flex flex-col cursor-pointer shrink-0"
          >
            <span className="text-2xl font-bold text-[#1b72e8] dark:text-blue-400 leading-none">euro.algo</span>
            <span className="text-[10px] text-gray-500 font-medium tracking-wide">Algorand Blockchain Explorer</span>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-[45%] max-w-3xl items-center">
            <div className="relative w-full flex items-center">
              <input 
                type="text" 
                placeholder="Search by Address / Tx ID / Group Tx ID / Block / Asset Name / Asset ID / App ID" 
                className="w-full h-10 px-4 rounded-l-md border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-1 focus:ring-[#1b72e8] focus:border-[#1b72e8] dark:bg-dark dark:border-gray-700"
              />
              <button className="h-10 px-6 bg-[#1b72e8] hover:bg-blue-600 text-white rounded-r-md transition-colors flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </button>
            </div>
          </div>

          {/* Right Area */}
          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            <div className="hidden sm:flex px-3 py-1.5 border border-blue-200 text-[#1b72e8] rounded text-xs font-semibold bg-blue-50/50 cursor-pointer hover:bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300">
              MAINNET ▾
            </div>
            
            <StrictMode>
              <PeraConnect />
            </StrictMode>

            {isMounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:bg-dark dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle Theme"
              >
                {theme === 'dark' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row (Navigation) */}
      <div className="hidden md:flex h-12 items-center justify-center px-4 sm:px-6 lg:px-8 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-light-dark shadow-sm">
        <ul className="flex items-center justify-center gap-6 lg:gap-10 text-sm font-medium text-gray-600 dark:text-gray-300">
          {navLinks.map((link) => (
            <li key={link.name}>
              <a href={link.href} className="hover:text-[#1b72e8] transition-colors flex items-center gap-1 cursor-pointer">
                {link.name}
                {['Statistics', 'Blockchain', 'Tools', 'Developer API'].includes(link.name) && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><polyline points="6 9 12 15 18 9"></polyline></svg>
                )}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
