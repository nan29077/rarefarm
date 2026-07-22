"use client";

import { useState } from "react";
import { Bell, Mail, Smartphone, ShoppingBag, Gavel, MessageSquare, Settings } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Panel } from "@/components/admin/AdminUI";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/providers/ToastProvider";
import { cn } from "@/lib/utils";

function Toggle({
  label,
  desc,
  defaultOn = false,
}: {
  label: string;
  desc: string;
  defaultOn?: boolean;
}) {
  const [on, setOn] = useState(defaultOn);
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
          min={0}
          onChange={(e) => setVal(Number(e.target.value))}
          className="w-20 rounded-lg border border-neutral-300 px-2 py-1 text-right text-sm focus:border-brand-500 focus:outline-none"
        />
        <span className="text-sm text-neutral-500">{unit}</span>
      </div>
    </div>
  );
}

export default function AdminNotificationsPage() {
  const { toast } = useToast();

  return (
    <AdminLayout title="알림 설정">
      <div className="grid gap-6 xl:grid-cols-2">
        {/* 이메일 알림 */}
        <Panel title="이메일 알림">
          <div className="divide-y divide-neutral-100">
            <Toggle label="이메일 알림 전체 활성화" desc="모든 이메일 알림의 마스터 스위치입니다." defaultOn />
            <Toggle label="회원 가입 환영 이메일" desc="새 회원 가입 시 환영 이메일을 발송합니다." defaultOn />
            <Toggle label="낙찰 확인 이메일" desc="경매 낙찰 시 낙찰자에게 이메일 발송" defaultOn />
            <Toggle label="결제 기한 임박 이메일" desc="결제 기한 1시간 전 이메일 발송" defaultOn />
            <Toggle label="배송 시작 이메일" desc="판매자가 발송 처리 시 구매자에게 이메일 발송" defaultOn />
            <Toggle label="거래 완료 이메일" desc="거래 완료 시 판매자/구매자 모두에게 발송" defaultOn />
            <Toggle label="판매자 승인/거절 이메일" desc="판매자 전환 심사 결과 이메일 발송" defaultOn />
            <Toggle label="신고 처리 결과 이메일" desc="신고 처리 완료 시 신고자에게 발송" />
          </div>
        </Panel>

        {/* 앱 (인앱) 알림 */}
        <Panel title="앱 (인앱) 알림">
          <div className="divide-y divide-neutral-100">
            <Toggle label="인앱 알림 전체 활성화" desc="앱 내 알림 기능의 마스터 스위치입니다." defaultOn />
            <Toggle label="입찰 체결 알림" desc="구매/판매 입찰이 체결될 때 알림" defaultOn />
            <Toggle label="라이브 시작 알림" desc="즐겨찾기한 판매자의 라이브 시작 알림" defaultOn />
            <Toggle label="경매 입찰 알림" desc="내 상품에 입찰이 들어올 때 알림" defaultOn />
            <Toggle label="새 댓글 알림" desc="내 게시물에 댓글이 달릴 때 알림" defaultOn />
            <Toggle label="팔로워 알림" desc="새로운 팔로워 발생 시 알림" />
            <Toggle label="시스템 공지 알림" desc="중요 시스템 공지 알림 발송" defaultOn />
          </div>
        </Panel>

        {/* 마케팅 알림 */}
        <Panel title="마케팅 알림">
          <div className="divide-y divide-neutral-100">
            <Toggle label="마케팅 이메일 허용" desc="이벤트, 할인, 신상품 소식 이메일 발송" />
            <Toggle label="마케팅 앱 푸시 허용" desc="이벤트, 프로모션 관련 앱 푸시 알림" />
            <Toggle label="재입고 알림" desc="관심 상품 재입고 시 알림" defaultOn />
            <Toggle label="가격 변동 알림" desc="관심 상품 가격 변동 시 알림" defaultOn />
          </div>
        </Panel>

        {/* 알림 발송 조건 */}
        <Panel title="알림 발송 조건">
          <div className="divide-y divide-neutral-100">
            <NumberField
              label="야간 알림 제한 시작"
              desc="이 시간 이후 앱 푸시 알림 발송 중지"
              defaultValue={22}
              unit="시"
            />
            <NumberField
              label="야간 알림 제한 종료"
              desc="이 시간 이후 앱 푸시 알림 재개"
              defaultValue={8}
              unit="시"
            />
            <NumberField
              label="알림 재발송 대기 시간"
              desc="동일 이벤트 알림 재발송 최소 간격"
              defaultValue={30}
              unit="분"
            />
            <NumberField
              label="이메일 발송 최대 횟수"
              desc="회원 1인당 일일 최대 이메일 발송 수"
              defaultValue={5}
              unit="회"
            />
          </div>
        </Panel>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={() => toast("알림 설정이 저장되었습니다.")}>설정 저장</Button>
      </div>
    </AdminLayout>
  );
}
