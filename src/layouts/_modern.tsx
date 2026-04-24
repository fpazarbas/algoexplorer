import cn from 'classnames';
import Header from '@/layouts/header/header';

export default function ModernLayout({
  children,
  contentClassName,
}: React.PropsWithChildren<{ contentClassName?: string }>) {
  return (
    <div className="w-full bg-[#f8f9fa] dark:bg-dark min-h-screen">
      <Header />
      <main
        className={cn(
          'w-full px-4 pt-4 pb-16 sm:px-6 sm:pb-20 lg:px-8 xl:pb-24 3xl:px-10 3xl:pt-0.5',
          contentClassName
        )}
      >
        {children}
      </main>
    </div>
  );
}
