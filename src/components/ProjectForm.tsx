"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { Project, ProjectCreateInput } from "@/lib/types";

type ProjectFormProps = {
  onSubmit: (input: ProjectCreateInput) => void;
  initialProject?: Project;
  submitLabel?: string;
};

export function ProjectForm({
  onSubmit,
  initialProject,
  submitLabel = "프로젝트 만들기"
}: ProjectFormProps) {
  const [name, setName] = useState(initialProject?.name ?? "");
  const [description, setDescription] = useState(initialProject?.description ?? "");
  const [error, setError] = useState("");
  const isEditing = Boolean(initialProject);

  useEffect(() => {
    setName(initialProject?.name ?? "");
    setDescription(initialProject?.description ?? "");
    setError("");
  }, [initialProject?.id, initialProject?.name, initialProject?.description]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setError("프로젝트명을 입력해주세요.");
      return;
    }

    onSubmit({ name, description });
    if (!isEditing) {
      setName("");
      setDescription("");
    }
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
        {submitLabel}
        <ArrowRight size={16} />
      </button>
    </form>
  );
}
