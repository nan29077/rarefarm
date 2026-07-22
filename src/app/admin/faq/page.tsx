"use client";

import { useState } from "react";
import { HelpCircle, Plus, Pencil, Trash2, ChevronDown } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { StatCard, Panel } from "@/components/admin/AdminUI";
import { Button } from "@/components/common/Button";
import { Modal } from "@/components/common/Modal";
import { useToast } from "@/components/providers/ToastProvider";
import { cn } from "@/lib/utils";

interface FaqItem {
  id: string;
  category: string;
  question: string;
  answer: string;
  order: number;
}

const INITIAL_FAQS: FaqItem[] = [
  {
    id: "faq1",
    category: "경매",
    question: "라이브 경매에서 입찰은 어떻게 하나요?",
    answer: "라이브 방송 중에 입찰가를 입력하고 '입찰' 버튼을 클릭하세요. 현재 최고 입찰가보다 높은 금액만 입찰 가능합니다.",
    order: 1,
  },
  {
    id: "faq2",
    category: "경매",
    question: "낙찰 후 결제 기한은 얼마나 되나요?",
    answer: "낙찰 후 24시간 이내에 결제를 완료해야 합니다. 미결제 시 낙찰이 취소되고 불이익이 발생할 수 있습니다.",
    order: 2,
  },
  {
    id: "faq3",
    category: "배송",
    question: "생물 배송은 어떻게 이루어지나요?",
    answer: "생물 배송은 전문 생물 배달 업체를 통해 안전하게 포장하여 발송됩니다. 배송 중 폐사 시 판매자 정책에 따라 처리됩니다.",
    order: 3,
  },
  {
    id: "faq4",
    category: "거래",
    question: "판매자로 전환하려면 어떻게 해야 하나요?",
    answer: "마이페이지 > 판매자 전환 신청에서 신청서를 제출해주세요. 관리자 검토 후 승인 시 판매자 기능을 이용할 수 있습니다.",
    order: 4,
  },
  {
    id: "faq5",
    category: "계정",
    question: "회원 탈퇴 후 재가입이 가능한가요?",
    answer: "탈퇴 후 30일이 지나면 동일 이메일로 재가입이 가능합니다. 단, 이전 거래 기록 및 적립금은 복구되지 않습니다.",
    order: 5,
  },
];

const CATEGORIES = ["전체", "경매", "거래", "배송", "계정", "결제", "기타"];
const inputCls = "w-full rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none focus:border-brand-500";

export default function AdminFaqPage() {
  const { toast } = useToast();
  const [faqs, setFaqs] = useState<FaqItem[]>(INITIAL_FAQS);
  const [catFilter, setCatFilter] = useState("전체");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editTarget, setEditTarget] = useState<FaqItem | null>(null);
  const [editForm, setEditForm] = useState<Omit<FaqItem, "id" | "order">>({
    category: "경매",
    question: "",
    answer: "",
  });
  const [addForm, setAddForm] = useState<Omit<FaqItem, "id" | "order">>({
    category: "경매",
    question: "",
    answer: "",
  });
  const [deleteTarget, setDeleteTarget] = useState<FaqItem | null>(null);

  const filtered =
    catFilter === "전체" ? faqs : faqs.filter((f) => f.category === catFilter);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openEdit(faq: FaqItem) {
    setEditTarget(faq);
    setEditForm({ category: faq.category, question: faq.question, answer: faq.answer });
  }

  function saveEdit() {
    if (!editTarget || !editForm.question.trim() || !editForm.answer.trim()) {
      toast("질문과 답변을 모두 입력해주세요.", "error");
      return;
    }
    setFaqs((prev) =>
      prev.map((f) => (f.id === editTarget.id ? { ...f, ...editForm } : f))
    );
    setEditTarget(null);
    toast("FAQ가 수정되었습니다.");
  }

  function addFaq() {
    if (!addForm.question.trim() || !addForm.answer.trim()) {
      toast("질문과 답변을 모두 입력해주세요.", "error");
      return;
    }
    const newFaq: FaqItem = {
      id: `faq${Date.now()}`,
      category: addForm.category,
      question: addForm.question.trim(),
      answer: addForm.answer.trim(),
      order: faqs.length + 1,
    };
    setFaqs((prev) => [...prev, newFaq]);
    setAddForm({ category: "경매", question: "", answer: "" });
    toast("FAQ가 추가되었습니다.");
  }

  function deleteFaq() {
    if (!deleteTarget) return;
    setFaqs((prev) => prev.filter((f) => f.id !== deleteTarget.id));
    setDeleteTarget(null);
    toast("FAQ가 삭제되었습니다.");
  }

  const catCounts: Record<string, number> = {};
  CATEGORIES.slice(1).forEach((c) => {
    catCounts[c] = faqs.filter((f) => f.category === c).length;
  });

  return (
    <AdminLayout title="FAQ 관리">
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={HelpCircle} label="전체 FAQ" value={faqs.length} accent />
        <StatCard icon={HelpCircle} label="경매" value={catCounts["경매"] ?? 0} />
        <StatCard icon={HelpCircle} label="거래/배송" value={(catCounts["거래"] ?? 0) + (catCounts["배송"] ?? 0)} />
        <StatCard icon={HelpCircle} label="계정/결제" value={(catCounts["계정"] ?? 0) + (catCounts["결제"] ?? 0)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        {/* FAQ 추가 */}
        <Panel title="FAQ 추가">
          <div className="space-y-4 p-3">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-neutral-700">카테고리</label>
              <select
                value={addForm.category}
                onChange={(e) => setAddForm((f) => ({ ...f, category: e.target.value }))}
                className={inputCls}
              >
                {CATEGORIES.slice(1).map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-neutral-700">질문</label>
              <input
                value={addForm.question}
                onChange={(e) => setAddForm((f) => ({ ...f, question: e.target.value }))}
                placeholder="자주 묻는 질문을 입력하세요."
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-neutral-700">답변</label>
              <textarea
                value={addForm.answer}
                onChange={(e) => setAddForm((f) => ({ ...f, answer: e.target.value }))}
                rows={4}
                placeholder="답변 내용을 입력하세요."
                className={cn(inputCls, "resize-none")}
              />
            </div>
            <Button fullWidth onClick={addFaq}>
              <Plus className="h-4 w-4" strokeWidth={2} /> FAQ 추가하기
            </Button>
          </div>
        </Panel>

        {/* FAQ 목록 */}
        <Panel title={`FAQ 목록 (${filtered.length}개)`}>
          {/* 카테고리 필터 */}
          <div className="flex flex-wrap gap-2 px-3 pt-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCatFilter(c)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  catFilter === c
                    ? "border-neutral-900 bg-neutral-900 text-brand-400"
                    : "border-neutral-200 text-neutral-600 hover:border-brand-400 hover:bg-brand-50"
                )}
              >
                {c}
                {c !== "전체" && catCounts[c] != null && ` (${catCounts[c]})`}
              </button>
            ))}
          </div>

          <div className="mt-2 divide-y divide-neutral-100">
            {filtered.map((faq) => (
              <div key={faq.id} className="px-3 py-2">
                <button
                  className="flex w-full items-start gap-3 text-left"
                  onClick={() => toggleExpand(faq.id)}
                >
                  <span className="mt-0.5 shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                    {faq.category}
                  </span>
                  <span className="flex-1 text-sm font-semibold text-neutral-800">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0 text-neutral-400 transition-transform",
                      expanded.has(faq.id) && "rotate-180"
                    )}
                    strokeWidth={2}
                  />
                </button>
                {expanded.has(faq.id) && (
                  <div className="ml-[60px] mt-2">
                    <p className="text-sm text-neutral-600">{faq.answer}</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => openEdit(faq)}
                        className="flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1 text-xs text-neutral-500 hover:border-brand-400 hover:bg-brand-50"
                      >
                        <Pencil className="h-3 w-3" strokeWidth={2} /> 수정
                      </button>
                      <button
                        onClick={() => setDeleteTarget(faq)}
                        className="flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1 text-xs text-neutral-500 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" strokeWidth={2} /> 삭제
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="py-10 text-center text-sm text-neutral-400">
                해당 카테고리의 FAQ가 없습니다.
              </p>
            )}
          </div>
        </Panel>
      </div>

      {/* 수정 모달 */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="FAQ 수정">
        <div className="space-y-4 pb-2">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-neutral-700">카테고리</label>
            <select
              value={editForm.category}
              onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
              className={inputCls}
            >
              {CATEGORIES.slice(1).map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-neutral-700">질문</label>
            <input
              value={editForm.question}
              onChange={(e) => setEditForm((f) => ({ ...f, question: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-neutral-700">답변</label>
            <textarea
              value={editForm.answer}
              onChange={(e) => setEditForm((f) => ({ ...f, answer: e.target.value }))}
              rows={5}
              className={cn(inputCls, "resize-none")}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setEditTarget(null)}>취소</Button>
            <Button onClick={saveEdit}>저장하기</Button>
          </div>
        </div>
      </Modal>

      {/* 삭제 확인 모달 */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="FAQ 삭제">
        <div className="pb-2">
          <p className="text-sm text-neutral-600">
            <span className="font-bold text-neutral-900">"{deleteTarget?.question}"</span>을 삭제할까요?
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>취소</Button>
            <Button variant="danger" onClick={deleteFaq}>삭제하기</Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}
