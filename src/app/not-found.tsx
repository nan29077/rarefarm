import Link from "next/link";
import { CustomIcon } from "@/components/common/CustomIcon";

export default function NotFound() {
  return (
    <div className="honeycomb-gold flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-6 text-center">
      <div className="hex-clip mb-4 flex h-20 w-20 items-center justify-center bg-brand-100">
        <CustomIcon name="rf-warn" size={36} className="h-9 w-9" />
      </div>
      <h1 className="text-xl font-bold text-neutral-900">
        페이지를 찾을 수 없어요
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        요청하신 상품이나 페이지가 존재하지 않습니다.
      </p>
      <Link
        href="/"
        className="mt-5 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-neutral-900 transition-colors hover:bg-brand-400"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
