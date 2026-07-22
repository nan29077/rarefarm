"use client";

import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Panel } from "@/components/admin/AdminUI";
import { Button } from "@/components/common/Button";
import { resetStore } from "@/lib/store";
import { useToast } from "@/components/providers/ToastProvider";

function Toggle({
  label,
  desc,
  defaultOn,
}: {
  label: string;
  desc: string;
  defaultOn?: boolean;
}) {
  const [on, setOn] = useState(!!defaultOn);
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <div>
        <p className="text-sm font-semibold text-neutral-800">{label}</p>
        <p className="text-xs text-neutral-400">{desc}</p>
      </div>
      <button
        onClick={() => setOn(!on)}
        className={
          "relative h-6 w-11 rounded-full transition-colors " +
          (on ? "bg-brand-500" : "bg-neutral-300")
        }
      >
        <span
          className={
            "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all " +
            (on ? "left-[22px]" : "left-0.5")
          }
        />
      </button>
    </div>
  );
}

export default function AdminSettingsPage() {
  const { toast } = useToast();
  return (
    <AdminLayout title="설정">
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="운영 정책">
          <div className="divide-y divide-neutral-100">
            <Toggle
              label="에어소프트건 성인 인증 필수"
              desc="성인/법규 확인 필요 상품군에 인증을 요구합니다."
              defaultOn
            />
            <Toggle
              label="신규 상품 자동 노출"
              desc="등록 즉시 마켓에 노출합니다."
              defaultOn
            />
            <Toggle
              label="커뮤니티 게시물 사전 검수"
              desc="게시 전 관리자 검수를 거칩니다."
            />
          </div>
        </Panel>

        <Panel title="데이터 관리">
          <div className="space-y-3 p-4">
            <p className="text-sm text-neutral-500">
              현재 데모는 localStorage 기반 mock 데이터로 동작합니다. 실제 API
              연동 시 service layer만 교체하면 됩니다.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                resetStore();
                toast("데모 데이터를 초기화했습니다.");
              }}
            >
              데모 데이터 초기화
            </Button>
          </div>
        </Panel>
      </div>
    </AdminLayout>
  );
}
