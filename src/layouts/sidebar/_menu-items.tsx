import routes from '@/config/routes';
import { HomeIcon } from '@/components/icons/home';
import { FarmIcon } from '@/components/icons/farm';
import { PoolIcon } from '@/components/icons/pool';
import { InfoIcon } from '@/components/icons/info-icon';
import { PowerIcon } from '@/components/icons/power';
import { RocketIcon } from '@/components/icons/rocketIcon';
import { CompassIcon } from '@/components/icons/compass';

export const menuItems = [
  {
    name: 'Home',
    icon: <HomeIcon />,
    href: routes.home,
  },
  {
    name: 'Swap',
    icon: <PoolIcon />,
    href:  routes.swap,
  },
   {
    name: 'Launch Pad',
    icon: <RocketIcon />,
    href:  routes.launchPad,
  },
  // {
  //   name: 'Explore NFTs',
  //   icon: <CompassIcon />,
  //   href: routes.search,
  // },
  //   name: 'Create NFT',
  //   icon: <PlusCircle />,
  //   href: routes.createNft,
  // },

  {
    name: 'Info',
    icon: <InfoIcon />,
    href: routes.vote,
    dropdownItems: [
      {
        name: 'White Paper',
        icon:<PowerIcon />,
        href: routes.whitepaper,
      }
    ],
  },
];
