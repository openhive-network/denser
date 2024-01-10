import { LoginPanel } from '@/auth/components/login-panel';

export default function LoginPage() {
  return (
    <div className="pt-16 flex flex-col sm:flex-row gap-24 mx-2
        sm:gap-0 sm:justify-around">
      <div className="flex flex-col gap-3 sm:gap-8 sm:mr-4">
        <LoginPanel />
      </div>
    </div>
  );
}

export { loginPageController as getServerSideProps } from '@/auth/lib/login-page-controller';
