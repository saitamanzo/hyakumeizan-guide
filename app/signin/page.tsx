import SignInForm from '@/components/auth/SignInForm';

export const metadata = {
  title: 'ログイン - 百名山ガイド',
  description: '百名山ガイドにログインして、登山記録や山の情報を共有しましょう。',
};

export default function SignInPage() {
  return <SignInForm />;
}
