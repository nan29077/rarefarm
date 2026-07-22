"use client";

import { useState } from "react";
import { Settings, Radio, Shield, Clock, MessageSquare, Bell } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Panel } from "@/components/admin/AdminUI";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/providers/ToastProvider";
import { cn } from "@/lib/utils";

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
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          on ? "bg-brand-500" : "bg-neutral-300"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
            on ? "left-[22px]" : "left-0.5"
          )}
        />
      </button>
    </div>
  );
}

function NumberField({
  label,
  desc,
  defaultValue,
  unit,
}: {
  label: string;
  desc: string;
  defaultValue: number;
  unit: string;
}) {
  const [val, setVal] = useState(defaultValue);
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <div>
        <p className="text-sm font-semibold text-neutral-800">{label}</p>
        <p className="text-xs text-neutral-400">{desc}</p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={val}
          min={1}
          onChange={(e) => setVal(Number(e.target.value))}
          className="w-20 rounded-lg border border-neutral-300 px-2 py-1 text-right text-sm focus:border-brand-500 focus:outline-none"
        />
        <span className="text-sm text-neutral-500">{unit}</span>
      </div>
    </div>
  );
}

export default function AdminBroadcastPage() {
  const { toast } = useToast();

  function save() {
    toast("방송 설정이 저장되었습니다.");
  }

  return (
    <AdminLayout title="방송 설정">
      <div className="grid gap-6 xl:grid-cols-2">
        {/* 기본 방송 설정 */}
        <Panel title="기본 방송 설정">
          <div className="divide-y divide-neutral-100">
            <Toggle
              label="라이브 경매 기능 활성화"
              desc="전체 라이브 경매 기능을 활성화합니다."
              defaultOn
            />
            <Toggle
              label="라이브 방송 공개 노출"
              desc="예정/진행 중인 라이브를 메인 화면에 노출합니다."
              defaultOn
            />
            <Toggle
              label="즉시 낙찰가 허용"
              desc="판매자가 즉시 낙찰가를 설정할 수 있습니다."
              defaultOn
            />
            <Toggle
              label="YouTube 플랫폼 허용"
              desc="YouTube Live를 방송 플랫폼으로 사용할 수 있습니다."
              defaultOn
            />
            <Toggle
              label="Instagram 플랫폼 허용"
              desc="Instagram Live를 방송 플랫폼으로 사용할 수 있습니다."
              defaultOn
            />
          </div>
        </Panel>

        {/* 경매 시간 설정 */}
        <Panel title="경매 시간 설정">
          <div className="divide-y divide-neutral-100">
            <NumberField
              label="기본 상품 경매 시간"
              desc="상품당 기본 경매 진행 시간"
              defaultValue={120}
              unit="초"
            />
            <NumberField
              label="최대 경매 시간"
              desc="상품당 최대 허용 경매 시간"
              defaultValue={600}
              unit="초"
            />
            <NumberField
              label="라이브 최대 상품 수"
              desc="라이브당 등록 가능한 최대 상품 수"
              defaultValue={30}
              unit="개"
            />
            <NumberField
              label="결제 기한"
              desc="낙찰 후 결제 기한 (시간)"
              defaultValue={24}
              unit="시간"
            />
          </div>
        </Panel>

        {/* 채팅 설정 */}
        <Panel title="채팅 설정">
          <div className="divide-y divide-neutral-100">
            <Toggle
              label="채팅 기능 활성화"
              desc="라이브 채팅을 허용합니다."
              defaultOn
            />
            <Toggle
              label="채팅 욕설 필터링"
              desc="금칙어 자동 필터링을 적용합니다."
              defaultOn
            />
            <Toggle
              label="비회원 채팅 허용"
              desc="로그인 없이도 채팅 열람이 가능합니다."
              defaultOn
            />
            <NumberField
              label="채팅 메시지 최대 길이"
              desc="한 번에 보낼 수 있는 최대 글자 수"
              defaultValue={100}
              unit="자"
            />
          </div>
        </Panel>

        {/* 알림 설정 */}
        <Panel title="라이브 알림 설정">
          <div className="divide-y divide-neutral-100">
            <Toggle
              label="라이브 시작 알림"
              desc="예약한 판매자의 라이브 시작 시 구매자에게 알림 전송"
              defaultOn
            />
            <Toggle
              label="낙찰 알림"
              desc="낙찰 즉시 낙찰자에게 알림 전송"
              defaultOn
            />
            <Toggle
              label="결제 기한 임박 알림"
              desc="결제 기한 1시간 전 알림 전송"
              defaultOn
            />
            <Toggle
              label="배송 완료 자동 구매 확정 알림"
              desc="배송 완료 15일 후 자동 구매 확정 안내"
              defaultOn
            />
          </div>
        </Panel>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={save}>설정 저장</Button>
      </div>
    </AdminLayout>
  );
}
