import { useEffect } from 'react';
import { Close } from '@/components/icons/close';
import cn from 'classnames';

interface ErrorPopupProps {
  message: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ErrorPopup({ message, isOpen, onClose }: ErrorPopupProps) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed top-24 left-1/2 z-50 -translate-x-1/2 transform transition-all duration-300 ease-in-out px-4 w-full max-w-sm">
      <div className="flex items-center justify-between rounded-xl border border-red-500/50 bg-red-500/10 p-4 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20 text-red-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-white sm:text-base">{message}</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-1 text-gray-300 hover:bg-red-500/20 hover:text-white transition-colors"
        >
          <Close className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
