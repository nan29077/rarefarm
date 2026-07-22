import { MobileShell } from "@/components/layout/MobileShell";
import { PostDetail } from "@/components/community/PostDetail";

export default function CommunityPostPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <MobileShell>
      <PostDetail postId={params.id} />
    </MobileShell>
  );
}
