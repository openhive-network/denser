import { Input } from '@hive/ui';
import { Icons } from '@ui/components/icons';
import { useRouter } from 'next/router';
import { useState, KeyboardEvent } from 'react';

const AISearchInput = () => {
  const router = useRouter();
  const query = router.query.q as string;
  const [value, setValues] = useState('');
  const handleEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      router.push(`/search?q=${encodeURIComponent(value)}`);
    }
  };

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <Icons.search className="h-5 w-5 rotate-90" />
      </div>
      <Input
        type="search"
        className="block rounded-full p-4 pl-10 text-sm "
        placeholder="Search..."
        value={value}
        defaultValue={query}
        onChange={(e) => setValues(e.target.value)}
        onKeyDown={(e) => handleEnter(e)}
      />
    </div>
  );
};
export default AISearchInput;
