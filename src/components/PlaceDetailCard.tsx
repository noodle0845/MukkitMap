"use client";

import { useState } from "react";
import {
  BadgeCheck,
  CheckCircle2,
  ExternalLink,
  Heart,
  MapPin,
  Pencil,
  Send,
  Sparkles,
  Star,
  Trash2
} from "lucide-react";
import type { Member, Place, PlaceReactionType, PlaceSocialSummary } from "@/lib/types";
import { formatDate, getMemberColor } from "@/lib/utils";

type PlaceDetailCardProps = {
  place: Place;
  member?: Member;
  social?: PlaceSocialSummary;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleReaction?: (reactionType: PlaceReactionType) => void;
  onVerifyVisit?: () => void;
  onCreateReview?: (content: string) => Promise<void> | void;
  onReviewBlocked?: () => void;
  actionLoading?: boolean;
  verifying?: boolean;
  reviewSubmitting?: boolean;
  canInteract?: boolean;
};

const emptySocial: PlaceSocialSummary = {
  likeCount: 0,
  wantCount: 0,
  likedByMe: false,
  wantedByMe: false,
  visitedByMe: false,
  isMukkitPick: false,
  reviews: []
};

export function PlaceDetailCard({
  place,
  member,
  social,
  onEdit,
  onDelete,
  onToggleReaction,
  onVerifyVisit,
  onCreateReview,
  onReviewBlocked,
  actionLoading,
  verifying,
  reviewSubmitting,
  canInteract = true
}: PlaceDetailCardProps) {
  const summary = social ?? emptySocial;
  const [reviewContent, setReviewContent] = useState("");

  async function handleReviewSubmit() {
    const content = reviewContent.trim();
    if (!summary.visitedByMe) {
      onReviewBlocked?.();
      return;
    }
    if (!content) return;
    await onCreateReview?.(content);
    setReviewContent("");
  }

  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-slate-400">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: getMemberColor(member) }}
            aria-hidden
          />
          <span>{member?.nickname ?? "추천자 없음"} 추천</span>
          <span aria-hidden>·</span>
          <span>{place.category}</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h2 className="text-[22px] font-bold leading-tight text-slate-900">
            {place.name}
          </h2>
          {summary.isMukkitPick ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[12px] font-extrabold text-amber-700 ring-1 ring-amber-200">
              <Sparkles size={13} />
              먹킷각
            </span>
          ) : null}
          {summary.visitedByMe ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[12px] font-extrabold text-emerald-700 ring-1 ring-emerald-200">
              <BadgeCheck size={13} />
              도장 완료
            </span>
          ) : null}
        </div>

        <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-slate-500">
          <MapPin size={15} className="mt-1 shrink-0" />
          {place.address}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          aria-pressed={summary.likedByMe}
          className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-extrabold transition ${
            summary.likedByMe
              ? "border-rose-200 bg-rose-50 text-rose-600"
              : "border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
          }`}
          disabled={!canInteract || actionLoading}
          onClick={() => onToggleReaction?.("like")}
          type="button"
        >
          <Heart size={16} fill={summary.likedByMe ? "currentColor" : "none"} />
          좋아요 {summary.likeCount}
        </button>
        <button
          aria-pressed={summary.wantedByMe}
          className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-extrabold transition ${
            summary.wantedByMe
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-slate-200 bg-white text-slate-600 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700"
          }`}
          disabled={!canInteract || actionLoading}
          onClick={() => onToggleReaction?.("want")}
          type="button"
        >
          <Star size={16} fill={summary.wantedByMe ? "currentColor" : "none"} />
          가고 싶어요 {summary.wantCount}
        </button>
      </div>

      <button
        className={`w-full rounded-2xl px-4 py-3 text-sm font-extrabold transition ${
          summary.visitedByMe
            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
            : "bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400"
        }`}
        disabled={!canInteract || verifying || summary.visitedByMe}
        onClick={onVerifyVisit}
        type="button"
      >
        {summary.visitedByMe ? (
          <span className="inline-flex items-center justify-center gap-2">
            <CheckCircle2 size={16} />
            방문 완료
          </span>
        ) : verifying ? (
          "위치 확인 중..."
        ) : (
          "방문 인증하기"
        )}
      </button>

      <div className="rounded-2xl bg-slate-50 px-4 py-4">
        <p className="caption">메모</p>
        <p className="mt-1.5 text-sm leading-6 text-slate-700">
          {place.comment || "아직 메모가 없습니다."}
        </p>
      </div>

      {place.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {place.tags.map((tag) => (
            <span
              className="rounded-full bg-slate-100 px-2.5 py-1 text-[12px] font-bold text-slate-600"
              key={tag}
            >
              #{tag}
            </span>
          ))}
        </div>
      ) : null}

      <div className="rounded-2xl border border-[var(--border-soft)] p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-extrabold text-slate-900">인증 리뷰</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">
              방문 인증을 완료한 뒤 리뷰를 남길 수 있어요.
            </p>
          </div>
          <span className="pill">{summary.reviews.length}개</span>
        </div>

        <div className="mt-4 space-y-2">
          <textarea
            className="input min-h-[90px] resize-none"
            disabled={!summary.visitedByMe || !canInteract || reviewSubmitting}
            onFocus={() => {
              if (!summary.visitedByMe) onReviewBlocked?.();
            }}
            onChange={(event) => setReviewContent(event.target.value)}
            placeholder={summary.visitedByMe ? "다녀온 느낌을 짧게 적어주세요." : "방문 인증 후 작성할 수 있어요."}
            value={reviewContent}
          />
          <button
            className="btn-primary w-full justify-center"
            disabled={!summary.visitedByMe || !reviewContent.trim() || reviewSubmitting}
            onClick={handleReviewSubmit}
            type="button"
          >
            <Send size={15} />
            {reviewSubmitting ? "저장 중..." : "리뷰 남기기"}
          </button>
        </div>

        {summary.reviews.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {summary.reviews.map((review) => (
              <li className="rounded-2xl bg-slate-50 p-3" key={review.id}>
                <div className="flex flex-wrap items-center gap-2">
                  {review.isVerifiedVisit ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                      <BadgeCheck size={11} />
                      인증 방문
                    </span>
                  ) : null}
                  <span className="text-[11px] font-semibold text-slate-400">
                    {formatDate(review.createdAt)}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-700">{review.content}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 pt-2 sm:flex-row">
        <a
          className="btn-primary flex-1"
          href={place.naverMapUrl}
          rel="noreferrer"
          target="_blank"
        >
          <ExternalLink size={16} />
          지도 보기
        </a>
        {onEdit ? (
          <button className="btn-ghost" onClick={onEdit} type="button">
            <Pencil size={15} />
            수정
          </button>
        ) : null}
        {onDelete ? (
          <button className="btn-danger" onClick={onDelete} type="button">
            <Trash2 size={15} />
            삭제
          </button>
        ) : null}
      </div>
    </div>
  );
}
