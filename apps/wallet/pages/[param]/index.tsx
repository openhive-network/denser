import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function ProfileIndex() {
  const router = useRouter();
  const { param } = router.query;

  useEffect(() => {
    if (param) {
      router.replace(`/${param}/transfers`);
    }
  }, [param, router]);

  return null; // This component doesn't render anything
}
