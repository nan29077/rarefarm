"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { CustomIcon } from "@/components/common/CustomIcon";
import { MobileShell } from "@/components/layout/MobileShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/common/Button";
import { Badge } from "@/components/common/Badge";
import { marketService } from "@/lib/marketService";
import { conditionLabels } from "@/lib/utils";
import type { ProductCondition } from "@/types";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/providers/ToastProvider";

const conditions = Object.keys(conditionLabels) as ProductCondition[];

export default function SellPage() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(marketService.categories[0].id);
  const [brand, setBrand] = useState("");
  const [condition, setCondition] = useState<ProductCondition>("sealed");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  const selectedCat = marketService.getCategory(categoryId);

  function submit() {
    const p = Number(price.replace(/[^0-9]/g, ""));
    if (!name.trim()) return toast("상품명을 입력해주세요.", "error");
    if (!p) return toast("판매 희망가를 입력해주세요.", "error");
    const product = marketService.addProduct({
      name: name.trim(),
      categoryId,
      brand: brand.trim(),
      condition,
      price: p,
      description: desc.trim(),
      sellerId: user!.id,
    });
    toast("상품이 등록되었습니다.");
    router.push(`/product/${product.id}`);
  }

  return (
    <MobileShell>
      <PageHeader title="판매 등록" back={false} />
      <div className="space-y-5 px-4 py-4">
        {/* 이미지 업로드 mock */}
        <div>
          <Label>상품 이미지</Label>
          <div className="flex gap-2">
            <button className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-brand-300 bg-brand-50/50 text-brand-700 transition-colors hover:border-brand-500 hover:bg-brand-50">
              <CustomIcon name="rf-cert" size={24} className="h-6 w-6" />
              <span className="text-[10px] font-semibold">사진 추가</span>
            </button>
            <div className="honeycomb-dark flex h-20 w-20 items-center justify-center rounded-xl bg-gradient-to-br from-brand-300 to-brand-500 text-[11px] font-bold text-neutral-900">
              미리보기
            </div>
          </div>
          <p className="mt-1 text-[11px] text-neutral-400">
            * mock UI · 실제 업로드는 API 연동 시 지원됩니다.
          </p>
        </div>

        {/* 카테고리 */}
        <div>
          <Label>카테고리</Label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none focus:border-brand-500"
          >
            {marketService.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {selectedCat?.adultOnly && (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <ShieldAlert className="h-4 w-4" />
              <span>
                <Badge tone="red">성인 확인 필요</Badge>{" "}
                <Badge tone="amber">관련 법규 준수 필요</Badge> 상품군입니다.
              </span>
            </div>
          )}
        </div>

        <div>
          <Label>상품명</Label>
          <Input value={name} onChange={setName} placeholder="예: MG 프리덤 건담 Ver.2.0" />
        </div>
        <div>
          <Label>브랜드/제조사</Label>
          <Input value={brand} onChange={setBrand} placeholder="예: 반다이" />
        </div>

        {/* 상태 */}
        <div>
          <Label>상품 상태</Label>
          <div className="grid grid-cols-3 gap-2">
            {conditions.map((c) => (
              <button
                key={c}
                onClick={() => setCondition(c)}
                className={
                  "rounded-lg border py-2.5 text-xs font-semibold " +
                  (condition === c
                    ? "border-neutral-900 bg-neutral-900 text-brand-400"
                    : "border-neutral-200 text-neutral-500 hover:border-brand-400 hover:bg-brand-50")
                }
              >
                {conditionLabels[c]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>판매 희망가</Label>
          <Input
            value={price}
            onChange={setPrice}
            placeholder="가격 (원)"
            inputMode="numeric"
          />
        </div>

        <div>
          <Label>상품 설명</Label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={4}
            placeholder="상품 상태, 구성품 등을 자세히 적어주세요."
            className="w-full resize-none rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none focus:border-brand-500"
          />
        </div>

        <Button fullWidth size="lg" onClick={submit}>
          판매 등록하기
        </Button>

        {/* 판매 안내 카드 */}
        <div className="honeycomb-light overflow-hidden rounded-2xl bg-[#111111] p-4">
          <p className="text-sm font-bold text-brand-400">
            레어팜 판매 꿀팁
          </p>
          <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-neutral-300">
            <li className="flex gap-1.5">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
              박스·설명서·특전 등 구성품을 빠짐없이 기재하면 체결율이 올라가요.
            </li>
            <li className="flex gap-1.5">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
              최근 거래가 근처로 가격을 설정하면 즉시 체결 확률이 높아져요.
            </li>
            <li className="flex gap-1.5">
              <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-brand-400" />
              성인/법규 확인이 필요한 카테고리는 관련 규정을 꼭 지켜주세요.
            </li>
          </ul>
        </div>
      </div>
    </MobileShell>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-sm font-semibold text-neutral-700">
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: "numeric" | "text";
}) {
  return (
    <input
      value={value}
      inputMode={inputMode}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none focus:border-brand-500"
    />
  );
}
