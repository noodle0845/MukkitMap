"use client";

import { FormEvent, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { ProjectCreateInput } from "@/lib/types";

type ProjectFormProps = {
  onSubmit: (input: ProjectCreateInput) => void;
};

export function ProjectForm({ onSubmit }: ProjectFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setError("프로젝트명을 입력해주세요.");
      return;
    }

    onSubmit({ name, description });
    setName("");
    setDescription("");
    setError("");
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <label className="block">
        <span className="field-label">프로젝트명</span>
        <input
          className="field"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="예: 부산 친구 맛집지도"
          autoFocus
        />
      </label>

      <label className="block">
        <span className="field-label">설명 (선택)</span>
        <textarea
          className="field min-h-24 resize-y"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="어떤 장소를 모을 지도인지 짧게 적어주세요."
        />
      </label>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">
          {error}
        </p>
      ) : null}

      <button className="btn-primary w-full" type="submit">
        프로젝트 만들기
        <ArrowRight size={16} />
      </button>
    </form>
  );
}
