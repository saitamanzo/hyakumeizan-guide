import SignUpForm from '@/components/auth/SignUpForm';

export const metadata = {
  title: '新規会員登録 - 百名山ガイド',
  description: '百名山ガイドに登録して、登山記録や山の情報を共有しましょう。',
};

export default function SignUpPage() {
  return <SignUpForm />;
}
