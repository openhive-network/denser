import LoginForm from "../components/login-form-old";

export default function LoginOldPage() {
  return (
    <div className="pt-16 flex flex-col sm:flex-row gap-24 mx-2 sm:gap-0 sm:justify-around">
      <div className="flex flex-col gap-3 sm:gap-8 sm:mr-4">
        <LoginForm />
      </div>
    </div>
  );
}
