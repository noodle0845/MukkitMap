import { InvitePageClient } from "@/components/InvitePageClient";

type InvitePageProps = {
  params: Promise<{ code: string }>;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { code } = await params;
  return <InvitePageClient inviteCode={code} />;
}
