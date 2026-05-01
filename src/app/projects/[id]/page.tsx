import { ProjectPageClient } from "@/components/ProjectPageClient";

type ProjectDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProjectDetailPage({
  params
}: ProjectDetailPageProps) {
  const { id } = await params;

  return <ProjectPageClient projectId={id} />;
}
