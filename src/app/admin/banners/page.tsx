"use client";

import { useState } from "react";
import { GalleryHorizontalEnd, Pencil, Trash2, Plus, Link2 } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { StatCard, Panel, StatusPill } from "@/components/admin/AdminUI";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";
import { bannerService, BannerInput } from "@/lib/bannerService";
import { useStoreVersion } from "@/lib/useStore";
import { useToast } from "@/components/providers/ToastProvider";
import { cn } from "@/lib/utils";
import type { Banner } from "@/types";

const emptyForm: BannerInput = {
  imageUrl: "",
  title: "",
  subtitle: "",
  ctaText: "",
  ctaLink: "",
  order: 1,
};

export default function AdminBannersPage() {
  useStoreVersion();
  const { toast } = useToast();
  const banners = bannerService.getBanners();

  const [form, setForm] = useState<BannerInput>({
    ...emptyForm,
    order: banners.length + 1,
  });
  const [editTarget, setEditTarget] = useState<Banner | null>(null);
  const [editForm, setEditForm] = useState<BannerInput>(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);

  function validate(f: BannerInput): string | null {
    if (!f.imageUrl.trim()) return "이미지 URL을 입력해주세요.";
    if (!f.title.trim()) return "배너 제목을 입력해주세요.";
    return null;
  }

  function add() {
    const err = validate(form);
    if (err) return toast(err, "error");
    bannerService.addBanner({
      ...form,
      imageUrl: form.imageUrl.trim(),
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      ctaText: form.ctaText.trim(),
      ctaLink: form.ctaLink.trim(),
    });
    setForm({ ...emptyForm, order: banners.length + 2 });
    toast("배너가 추가되었습니다.");
  }

  function openEdit(b: Banner) {
    setEditTarget(b);
    setEditForm({
      imageUrl: b.imageUrl,
      title: b.title,
      subtitle: b.subtitle,
      ctaText: b.ctaText,
      ctaLink: b.ctaLink,
      order: b.order,
    });
  }

  function saveEdit() {
    if (!editTarget) return;
    const err = validate(editForm);
    if (err) return toast(err, "error");
    bannerService.updateBanner(editTarget.id, editForm);
    setEditTarget(null);
    toast("배너가 수정되었습니다.");
  }

  function remove() {
    if (!deleteTarget) return;
    bannerService.deleteBanner(deleteTarget.id);
    setDeleteTarget(null);
    toast("배너가 삭제되었습니다.");
  }

  const activeCount = banners.filter((b) => b.isActive).length;

  return (
    <AdminLayout title="배너 관리">
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={GalleryHorizontalEnd} label="전체 배너" value={banners.length} accent />
        <StatCard icon={GalleryHorizontalEnd} label="노출 중 배너" value={activeCount} />
        <StatCard icon={GalleryHorizontalEnd} label="비노출 배너" value={banners.length - activeCount} />
        <StatCard icon={Link2} label="노출 위치" value="메인 상단" sub="자동 전환 5초" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        {/* 배너 추가 폼 */}
        <Panel title="새 배너 추가">
          <div className="space-y-4 p-3">
            <BannerFields form={form} onChange={setForm} />
            <Button fullWidth onClick={add}>
              <Plus className="h-4 w-4" strokeWidth={2} /> 배너 추가하기
            </Button>
          </div>
        </Panel>

        {/* 배너 목록 */}
        <Panel title={`배너 목록 (${banners.length})`}>
          <div className="space-y-3 p-3">
            {banners.map((b) => (
              <div
                key={b.id}
                className={cn(
                  "flex flex-wrap items-center gap-3 rounded-xl border p-3 transition-colors",
                  b.isActive ? "border-neutral-200 bg-white" : "border-neutral-100 bg-neutral-50 opacity-70"
                )}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-brand-400">
                  {b.order}
                </span>
                <div className="relative h-16 w-28 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="line-clamp-1 text-sm font-bold text-neutral-900">{b.title}</p>
                    <StatusPill tone={b.isActive ? "green" : "neutral"}>
                      {b.isActive ? "노출 중" : "비노출"}
                    </StatusPill>
                  </div>
                  <p className="line-clamp-1 text-xs text-neutral-500">{b.subtitle}</p>
                  {b.ctaText && (
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-neutral-400">
                      <Link2 className="h-3 w-3" strokeWidth={2} />
                      {b.ctaText} → {b.ctaLink || "-"}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {/* 노출 토글 */}
                  <button
                    role="switch"
                    aria-checked={b.isActive}
                    onClick={() => {
                      bannerService.setBannerActive(b.id, !b.isActive);
                      toast(b.isActive ? "배너를 비노출 처리했습니다." : "배너를 노출 처리했습니다.");
                    }}
                    className={cn(
                      "relative h-6 w-11 rounded-full transition-colors",
                      b.isActive ? "bg-brand-500" : "bg-neutral-200"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                        b.isActive ? "left-[22px]" : "left-0.5"
                      )}
                    />
                  </button>
                  <button
                    onClick={() => openEdit(b)}
                    className="rounded-lg border border-neutral-200 p-1.5 text-neutral-500 transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-neutral-900"
                    aria-label="수정"
                  >
                    <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(b)}
                    className="rounded-lg border border-neutral-200 p-1.5 text-neutral-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                    aria-label="삭제"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
              </div>
            ))}
            {banners.length === 0 && (
              <p className="py-10 text-center text-sm text-neutral-400">
                등록된 배너가 없습니다. 왼쪽에서 배너를 추가해보세요.
              </p>
            )}
          </div>
        </Panel>
      </div>

      {/* 수정 모달 */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="배너 수정">
        <div className="space-y-4 pb-2">
          <BannerFields form={editForm} onChange={setEditForm} />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              취소
            </Button>
            <Button onClick={saveEdit}>저장하기</Button>
          </div>
        </div>
      </Modal>

      {/* 삭제 확인 모달 */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="배너 삭제">
        <div className="pb-2">
          <p className="text-sm text-neutral-600">
            <span className="font-bold text-neutral-900">{deleteTarget?.title}</span> 배너를
            삭제할까요? 삭제 후에는 되돌릴 수 없습니다.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              취소
            </Button>
            <Button variant="danger" onClick={remove}>
              삭제하기
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}

// 배너 입력 필드 묶음 (추가/수정 공용)
function BannerFields({
  form,
  onChange,
}: {
  form: BannerInput;
  onChange: (f: BannerInput) => void;
}) {
  const set = (patch: Partial<BannerInput>) => onChange({ ...form, ...patch });
  return (
    <>
      <Field label="이미지 URL">
        <input
          value={form.imageUrl}
          onChange={(e) => set({ imageUrl: e.target.value })}
          placeholder="https://images.unsplash.com/..."
          className={inputCls}
        />
        {form.imageUrl.trim() && (
          <div className="relative mt-2 h-24 w-full overflow-hidden rounded-lg bg-neutral-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={form.imageUrl} alt="미리보기" className="absolute inset-0 h-full w-full object-cover" />
          </div>
        )}
      </Field>
      <Field label="제목">
        <input
          value={form.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder="배너 메인 문구"
          className={inputCls}
        />
      </Field>
      <Field label="설명">
        <input
          value={form.subtitle}
          onChange={(e) => set({ subtitle: e.target.value })}
          placeholder="배너 서브 문구"
          className={inputCls}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="CTA 버튼 문구">
          <input
            value={form.ctaText}
            onChange={(e) => set({ ctaText: e.target.value })}
            placeholder="마켓 둘러보기"
            className={inputCls}
          />
        </Field>
        <Field label="CTA 링크">
          <input
            value={form.ctaLink}
            onChange={(e) => set({ ctaLink: e.target.value })}
            placeholder="/market"
            className={inputCls}
          />
        </Field>
      </div>
      <Field label="노출 순서">
        <input
          value={String(form.order)}
          onChange={(e) => set({ order: Number(e.target.value.replace(/[^0-9]/g, "")) || 1 })}
          inputMode="numeric"
          className={inputCls}
        />
      </Field>
    </>
  );
}

const inputCls =
  "w-full rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none focus:border-brand-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-neutral-700">{label}</label>
      {children}
    </div>
  );
}
