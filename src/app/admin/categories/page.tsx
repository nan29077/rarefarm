"use client";

import { useState } from "react";
import { Tag, Pencil, Plus, MoveUp, MoveDown, Eye, EyeOff } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { StatCard, Panel } from "@/components/admin/AdminUI";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";
import { marketService } from "@/lib/marketService";
import { useStoreVersion } from "@/lib/useStore";
import { useToast } from "@/components/providers/ToastProvider";
import { Icon } from "@/components/common/Icon";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";

export default function AdminCategoriesPage() {
  useStoreVersion();
  const { toast } = useToast();

  // 로컬 상태로 카테고리 관리 (실제 API 연동 시 service layer 교체)
  const [categories, setCategories] = useState<Category[]>(() =>
    marketService.categories.map((c) => ({ ...c }))
  );
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [addMode, setAddMode] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");

  const visibleCount = categories.filter((c) => !hidden.has(c.id)).length;

  function openEdit(c: Category) {
    setEditTarget(c);
    setEditName(c.name);
  }

  function saveEdit() {
    if (!editTarget || !editName.trim()) return;
    setCategories((prev) =>
      prev.map((c) => (c.id === editTarget.id ? { ...c, name: editName.trim() } : c))
    );
    setEditTarget(null);
    toast("카테고리 이름을 수정했습니다.");
  }

  function toggleHidden(id: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    toast(hidden.has(id) ? "카테고리를 노출 처리했습니다." : "카테고리를 숨김 처리했습니다.");
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    setCategories((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }

  function moveDown(idx: number) {
    if (idx === categories.length - 1) return;
    setCategories((prev) => {
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }

  function addCategory() {
    if (!newName.trim() || !newSlug.trim()) {
      toast("이름과 슬러그를 입력해주세요.", "error");
      return;
    }
    if (categories.some((c) => c.slug === newSlug.trim())) {
      toast("이미 사용 중인 슬러그입니다.", "error");
      return;
    }
    const newCat: Category = {
      id: `c${Date.now()}`,
      name: newName.trim(),
      slug: newSlug.trim(),
      icon: "Tag",
    };
    setCategories((prev) => [...prev, newCat]);
    setNewName("");
    setNewSlug("");
    setAddMode(false);
    toast("카테고리가 추가되었습니다.");
  }

  return (
    <AdminLayout title="카테고리 관리">
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={Tag} label="전체 카테고리" value={categories.length} accent />
        <StatCard icon={Eye} label="노출 중" value={visibleCount} />
        <StatCard icon={EyeOff} label="숨김" value={hidden.size} />
        <StatCard icon={Plus} label="성인/법규" value={categories.filter((c) => c.adultOnly).length} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        {/* 카테고리 추가 */}
        <Panel title="카테고리 추가">
          <div className="space-y-4 p-3">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-neutral-700">카테고리 이름</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="예: 희귀 선인장"
                className="w-full rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-neutral-700">슬러그 (영문)</label>
              <input
                value={newSlug}
                onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/\s/g, "-"))}
                placeholder="예: rare-cactus"
                className="w-full rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none focus:border-brand-500"
              />
            </div>
            <Button fullWidth onClick={addCategory}>
              <Plus className="h-4 w-4" strokeWidth={2} /> 카테고리 추가
            </Button>
          </div>
        </Panel>

        {/* 카테고리 목록 */}
        <Panel title={`카테고리 목록 (${categories.length}개)`}>
          <div className="divide-y divide-neutral-100">
            {categories.map((c, idx) => (
              <div
                key={c.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 transition-colors hover:bg-neutral-50",
                  hidden.has(c.id) && "opacity-50"
                )}
              >
                {/* 순서 번호 */}
                <span className="w-5 shrink-0 text-center text-xs font-bold text-neutral-400">
                  {idx + 1}
                </span>
                {/* 아이콘 */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                  <Icon name={c.icon} className="h-4 w-4 text-brand-600" />
                </div>
                {/* 이름/슬러그 */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-neutral-900">{c.name}</p>
                  <p className="text-xs text-neutral-400">/{c.slug}</p>
                </div>
                {/* 성인 배지 */}
                {c.adultOnly && (
                  <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                    성인
                  </span>
                )}
                {/* 액션 버튼 */}
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    className="rounded p-1 text-neutral-400 hover:bg-neutral-100 disabled:opacity-30"
                    aria-label="위로"
                  >
                    <MoveUp className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => moveDown(idx)}
                    disabled={idx === categories.length - 1}
                    className="rounded p-1 text-neutral-400 hover:bg-neutral-100 disabled:opacity-30"
                    aria-label="아래로"
                  >
                    <MoveDown className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => toggleHidden(c.id)}
                    className="rounded p-1 text-neutral-400 hover:bg-neutral-100"
                    aria-label={hidden.has(c.id) ? "노출" : "숨김"}
                  >
                    {hidden.has(c.id) ? (
                      <EyeOff className="h-3.5 w-3.5" strokeWidth={2} />
                    ) : (
                      <Eye className="h-3.5 w-3.5" strokeWidth={2} />
                    )}
                  </button>
                  <button
                    onClick={() => openEdit(c)}
                    className="rounded p-1 text-neutral-400 hover:bg-neutral-100"
                    aria-label="수정"
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* 수정 모달 */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="카테고리 이름 수정">
        <div className="space-y-4 pb-2">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-neutral-700">카테고리 이름</label>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setEditTarget(null)}>취소</Button>
            <Button onClick={saveEdit}>저장하기</Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}
