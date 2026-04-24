import type { NextPage } from 'next';
import type { ReactElement, ReactNode } from 'react';

export type NextPageWithLayout<P = {}> = NextPage<P> & {
  authorization?: boolean;
  getLayout?: (page: ReactElement) => ReactNode;
};

export type CoinTypes = {
  id : number;
  icon: JSX.Element;
  code: string;
  name: string;
  amount: number;
  decimals: number;
  price: number;
};

export interface Attachment {
  id: string;
  original: string;
  thumbnail: string;
}
