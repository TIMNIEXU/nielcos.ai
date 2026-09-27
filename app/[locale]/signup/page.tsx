import { setRequestLocale } from "next-intl/server";
import SignupClient from "./SignupClient";

type Props = { params: Promise<{ locale: string }> };

export default async function SignupPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SignupClient />;
}
