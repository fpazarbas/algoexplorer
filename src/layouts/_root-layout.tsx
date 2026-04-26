import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import cn from 'classnames';
import { useLayout } from '@/lib/hooks/use-layout';
import { LAYOUT_OPTIONS } from '@/lib/constants';
import Loader from '@/components/ui/loader';
import { useIsMounted } from '@/lib/hooks/use-is-mounted';

// dynamic imports
const ModernLayout = dynamic(() => import('@/layouts/_modern'), {
  loading: () => <FallbackLoader />,
});

function FallbackLoader() {
  return (
    <div className="fixed z-50 grid h-full w-full place-content-center">
      <Loader variant="blink" />
    </div>
  );
}

export default function RootLayout({
  children,
  contentClassName,
}: React.PropsWithChildren<{ contentClassName?: string }>) {
  const [isAuraAnimated, setIsAuraAnimated] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAuraAnimated(false);
    }, 2500); // Stop animation after 2.5 seconds
    return () => clearTimeout(timer);
  }, []);

  return (
    <ModernLayout contentClassName={contentClassName}>
      <div 
        className={cn(
          'screen-aura',
          isAuraAnimated ? 'screen-aura-animated' : 'screen-aura-static'
        )} 
      />
      {children}
    </ModernLayout>
  );
}
