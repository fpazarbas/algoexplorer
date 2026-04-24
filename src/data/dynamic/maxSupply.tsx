type MaxSupplyProps = {
  maxSuppy: number;
};
export default function MaxSupply({ maxSuppy }: MaxSupplyProps) {
  return (
    <div className="mb-7 text-center font-medium tracking-tighter text-gray-900 dark:text-white xl:text-2xl 3xl:mb-8 3xl:text-[32px]">
      {maxSuppy}
    </div>
  );
}
