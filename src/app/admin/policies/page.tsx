"use client";

import { useState } from "react";
import { ScrollText, Save, Clock } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Panel } from "@/components/admin/AdminUI";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/providers/ToastProvider";
import { cn } from "@/lib/utils";

interface PolicyDoc {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  version: string;
}

const INITIAL_POLICIES: PolicyDoc[] = [
  {
    id: "terms",
    title: "서비스 이용약관",
    version: "v1.2",
    updatedAt: "2024-11-01",
    content: `제1조 (목적)
본 약관은 레어팜(이하 "회사")이 운영하는 레어팜 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자의 권리, 의무 및 책임 사항을 규정함을 목적으로 합니다.

제2조 (정의)
1. "서비스"란 회사가 제공하는 레어팜 마켓플레이스 및 라이브 경매 플랫폼을 의미합니다.
2. "이용자"란 본 약관에 따라 회사가 제공하는 서비스를 이용하는 회원 및 비회원을 말합니다.
3. "회원"이란 회사에 개인정보를 제공하여 회원등록을 한 자로서, 회사의 서비스를 이용할 수 있는 자를 말합니다.

제3조 (약관의 효력 및 변경)
1. 본 약관은 서비스를 이용하고자 하는 모든 이용자에 대하여 그 효력을 발생합니다.
2. 회사는 필요하다고 인정되는 경우 본 약관을 변경할 수 있으며, 변경된 약관은 서비스 내 공지사항에 게시합니다.

제4조 (서비스의 제공 및 변경)
1. 회사는 다음과 같은 서비스를 제공합니다.
   - 레어 생물 및 식물 거래 마켓플레이스
   - 라이브 경매 서비스
   - 커뮤니티 서비스
2. 회사는 서비스의 내용을 변경할 수 있으며, 이 경우 변경된 서비스의 내용 및 제공일자를 명시하여 공지합니다.`,
  },
  {
    id: "privacy",
    title: "개인정보 처리방침",
    version: "v1.1",
    updatedAt: "2024-11-01",
    content: `제1조 (개인정보의 처리 목적)
레어팜(이하 "회사")은 다음의 목적을 위하여 개인정보를 처리합니다.

1. 회원 가입 및 관리
   - 회원 가입 의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증
   - 회원자격 유지·관리, 서비스 부정이용 방지, 각종 고지·통지

2. 재화 또는 서비스 제공
   - 서비스 제공, 계약서·청구서 발송, 콘텐츠 제공, 맞춤 서비스 제공
   - 본인인증, 연령인증, 요금 결제·정산

3. 마케팅 및 광고에의 활용
   - 신규 서비스(제품) 개발 및 특화, 이벤트 및 광고성 정보 제공 및 참여기회 제공

제2조 (개인정보의 처리 및 보유 기간)
1. 회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의 받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
2. 각각의 개인정보 처리 및 보유 기간은 다음과 같습니다.
   - 회원 가입 및 관리: 회원 탈퇴 시까지
   - 재화 또는 서비스 제공: 재화 또는 서비스 공급 완료 및 요금 결제·정산 완료 시까지`,
  },
  {
    id: "auction",
    title: "경매 이용 정책",
    version: "v1.0",
    updatedAt: "2024-10-15",
    content: `제1조 (경매 참여 자격)
1. 레어팜 라이브 경매에 참여하려면 회원 가입 후 본인인증을 완료해야 합니다.
2. 계정이 정지된 회원은 경매에 참여할 수 없습니다.
3. CITES 규제 대상 종의 경우 별도 인증 서류가 필요할 수 있습니다.

제2조 (입찰 규정)
1. 입찰가는 현재 최고가보다 높아야 하며, 최소 입찰 단위 이상이어야 합니다.
2. 한 번 제출된 입찰은 취소할 수 없습니다.
3. 즉시 낙찰가를 제시하면 경매가 즉시 종료됩니다.

제3조 (낙찰 및 결제)
1. 경매 종료 시 최고 입찰자가 낙찰자가 됩니다.
2. 낙찰자는 낙찰 후 24시간 이내에 결제를 완료해야 합니다.
3. 24시간 내 미결제 시 낙찰이 취소되며, 향후 경매 참여에 제한이 생길 수 있습니다.
4. 결제는 레어팜이 지정한 결제 수단을 통해서만 가능합니다.

제4조 (배송)
1. 결제 완료 후 판매자는 3영업일 이내에 발송해야 합니다.
2. 생물 배송의 경우 전문 생물 배달 업체를 이용해야 합니다.
3. 배송 중 폐사 발생 시 판매자의 배송 책임 정책에 따라 처리됩니다.`,
  },
];

export default function AdminPoliciesPage() {
  const { toast } = useToast();
  const [policies, setPolicies] = useState<PolicyDoc[]>(INITIAL_POLICIES);
  const [activeId, setActiveId] = useState("terms");
  const [editContent, setEditContent] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());

  const activePolicy = policies.find((p) => p.id === activeId)!;
  const currentContent = editContent[activeId] ?? activePolicy.content;

  function handleChange(content: string) {
    setEditContent((prev) => ({ ...prev, [activeId]: content }));
    setDirty((prev) => new Set(prev).add(activeId));
  }

  function save() {
    const now = new Date().toISOString().slice(0, 10);
    setPolicies((prev) =>
      prev.map((p) =>
        p.id === activeId
          ? { ...p, content: currentContent, updatedAt: now }
          : p
      )
    );
    setDirty((prev) => {
      const next = new Set(prev);
      next.delete(activeId);
      return next;
    });
    toast(`${activePolicy.title}이(가) 저장되었습니다.`);
  }

  return (
    <AdminLayout title="약관/정책">
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* 문서 목록 */}
        <Panel title="약관 문서">
          <div className="divide-y divide-neutral-100">
            {policies.map((p) => (
              <button
                key={p.id}
                onClick={() => setActiveId(p.id)}
                className={cn(
                  "w-full px-4 py-3.5 text-left transition-colors hover:bg-neutral-50",
                  activeId === p.id && "bg-brand-50"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        activeId === p.id ? "text-brand-700" : "text-neutral-800"
                      )}
                    >
                      {p.title}
                      {dirty.has(p.id) && (
                        <span className="ml-1.5 rounded bg-amber-100 px-1 py-0.5 text-[10px] font-bold text-amber-600">
                          수정중
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-400">
                      <Clock className="h-3 w-3" strokeWidth={2} />
                      {p.updatedAt} · {p.version}
                    </p>
                  </div>
                  <ScrollText
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      activeId === p.id ? "text-brand-500" : "text-neutral-300"
                    )}
                    strokeWidth={1.75}
                  />
                </div>
              </button>
            ))}
          </div>
        </Panel>

        {/* 에디터 */}
        <div className="flex flex-col gap-3">
          <Panel title={activePolicy.title}>
            <div className="p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <Clock className="h-3.5 w-3.5" strokeWidth={2} />
                  마지막 수정: {activePolicy.updatedAt} ({activePolicy.version})
                </div>
                <Button onClick={save} disabled={!dirty.has(activeId)}>
                  <Save className="h-4 w-4" strokeWidth={2} /> 저장하기
                </Button>
              </div>
              <textarea
                value={currentContent}
                onChange={(e) => handleChange(e.target.value)}
                rows={24}
                spellCheck={false}
                className="w-full resize-none rounded-xl border border-neutral-300 p-4 font-mono text-sm leading-relaxed text-neutral-800 outline-none focus:border-brand-500"
              />
            </div>
          </Panel>

          <p className="text-xs text-neutral-400">
            * 약관 변경 사항은 저장 후 즉시 사용자에게 공개됩니다. 중요한 변경 시 반드시 공지사항을 함께 작성해주세요.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
