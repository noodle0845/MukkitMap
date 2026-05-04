"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, MapPin, UserPlus, XCircle } from "lucide-react";
import { GhostlyLogo } from "@/components/GhostlyLogo";
import { MemberForm } from "@/components/MemberForm";
import { useAuth } from "@/contexts/AuthContext";
import {
  checkMembership,
  getProjectByInviteCode,
  joinProjectByInviteCode
} from "@/lib/supabaseStorage";
import type { Project } from "@/lib/types";

type InvitePageClientProps = {
  inviteCode: string;
};

type PageState =
  | { kind: "loading" }
  | { kind: "invalid" }               // 코드가 없거나 만료
  | { kind: "need-login"; projectId: string; projectName: string }
  | { kind: "already-member"; projectId: string }
  | { kind: "join-form"; project: Project }   // 참여 확인
  | { kind: "joining" }
  | { kind: "joined"; projectId: string };

export function InvitePageClient({ inviteCode }: InvitePageClientProps) {
  const router = useRouter();
  const { user, authLoading } = useAuth();
  const [state, setState] = useState<PageState>({ kind: "loading" });

  useEffect(() => {
    if (authLoading) return;

    async function init() {
      // 1. 초대 코드로 프로젝트 조회 (RLS 없이 public 조회)
      const project = await getProjectByInviteCode(inviteCode);

      if (!project) {
        setState({ kind: "invalid" });
        return;
      }

      // 2. 로그인 여부 확인
      if (!user) {
        setState({
          kind: "need-login",
          projectId: project.id,
          projectName: project.name
        });
        return;
      }

      // 3. 이미 멤버인지 확인
      const existing = await checkMembership(project.id, user.id);
      if (existing) {
        setState({ kind: "already-member", projectId: project.id });
        return;
      }

      // 4. 참여 폼 표시
      setState({ kind: "join-form", project });
    }

    init().catch(() => setState({ kind: "invalid" }));
  }, [authLoading, user, inviteCode]);

  // ── 참여하기 ──────────────────────────────────────────────────
  async function handleJoin(input: Parameters<typeof joinProjectByInviteCode>[1]) {
    if (state.kind !== "join-form" || !user) return;

    setState({ kind: "joining" });
    try {
      await joinProjectByInviteCode(inviteCode, input);
      setState({ kind: "joined", projectId: state.project.id });
    } catch {
      setState({ kind: "join-form", project: state.project });
    }
  }

  // ── 뷰 ───────────────────────────────────────────────────────
  if (state.kind === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          초대 링크 확인 중…
        </span>
      </main>
    );
  }

  if (state.kind === "invalid") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <XCircle size={40} className="text-red-400" />
        <h1 className="title">유효하지 않은 초대 링크예요</h1>
        <p className="text-sm text-slate-500">링크가 만료되었거나 잘못된 주소예요.</p>
        <button className="btn-primary" onClick={() => router.push("/")} type="button">
          처음으로
        </button>
      </main>
    );
  }

  if (state.kind === "need-login") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
        <GhostlyLogo className="w-[140px]" />
        <div>
          <p className="text-[13px] font-semibold text-emerald-600">초대받은 먹킷맵</p>
          <h1 className="title mt-1">{state.projectName}</h1>
        </div>
        <p className="max-w-xs text-sm text-slate-500">
          이 먹킷맵에 참여하려면 먼저 로그인이 필요해요.
        </p>
        <button
          className="btn-primary w-full max-w-xs justify-center"
          onClick={() =>
            router.push(`/auth?returnTo=/invite/${inviteCode}`)
          }
          type="button"
        >
          로그인 / 회원가입
        </button>
      </main>
    );
  }

  if (state.kind === "already-member") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <CheckCircle size={40} className="text-emerald-500" />
        <h1 className="title">이미 참여 중인 먹킷맵이에요</h1>
        <button
          className="btn-primary"
          onClick={() => router.push(`/projects/${state.projectId}`)}
          type="button"
        >
          지도 바로 가기
        </button>
      </main>
    );
  }

  if (state.kind === "joining") {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          참여 처리 중…
        </span>
      </main>
    );
  }

  if (state.kind === "joined") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <CheckCircle size={40} className="text-emerald-500" />
        <h1 className="title">먹킷맵에 참여했어요! 🎉</h1>
        <button
          className="btn-primary"
          onClick={() => router.push(`/projects/${state.projectId}`)}
          type="button"
        >
          지도 보러 가기
        </button>
      </main>
    );
  }

  if (state.kind === "join-form") {
    const { project } = state;

    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">
          {/* 헤더 */}
          <div className="mb-6 flex flex-col items-center text-center">
            <GhostlyLogo className="mb-4 w-[120px]" />
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              <MapPin size={11} />
              초대받은 먹킷맵
            </span>
            <h1 className="title mt-2">{project.name}</h1>
            {project.description && (
              <p className="mt-1 text-sm text-slate-500">{project.description}</p>
            )}
          </div>

          {/* 참여 폼 */}
          <div className="card p-6">
            <div className="mb-5">
              <div className="flex items-center gap-2">
                <UserPlus size={16} className="text-emerald-600" />
                <h2 className="text-[15px] font-bold text-slate-900">내 정보 설정</h2>
              </div>
              <p className="mt-1 text-[13px] text-slate-500">
                지도에 표시될 닉네임과 마커 색상을 정해주세요.
              </p>
            </div>
            <MemberForm
              fixedRole="editor"
              onSubmit={handleJoin}
              submitLabel="참여하기"
            />
          </div>
        </div>
      </main>
    );
  }

  return null;
}
