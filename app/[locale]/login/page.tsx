import { setRequestLocale } from "next-intl/server";
import LoginClient from "./LoginClient";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { next } = await searchParams;
  return <LoginClient next={next} />;
}
