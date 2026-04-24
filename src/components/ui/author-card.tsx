import Avatar from '@/components/ui/avatar';
import { StaticImageData } from 'next/image';

type AuthorCardProps = {
  image: string;
  name?: string;
  role?: string;
};

export default function AuthorCard({ image, name, role }: AuthorCardProps) {
  return (
    <div
      className={`flex items-center rounded-lg  ${
        name
          ? 'bg-gray-100  p-5  dark:bg-light-dark'
          : 'ml-3 justify-between bg-none p-5 dark:mr-3 dark:bg-none'
      }`}
    >
      <Avatar
        image={image}
        alt={name ? name : ''}
        width={100}
        height={100}
        className="dark:border-gray-400"
      />
      <div className="ltr:pl-5 rtl:pr-5">
        <h3 className="text-xs font-normal uppercase tracking-tighter text-gray-600 dark:text-white">
          {name}
        </h3>
        <h3 className="text-xs font-normal uppercase tracking-tighter text-gray-600 dark:text-white">
          {role}
        </h3>
      </div>
    </div>
  );
}
