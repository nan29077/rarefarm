"use client";

import { useSyncExternalStore } from "react";
import { subscribe, getVersion } from "./store";

// 스토어 버전(변경 카운터)을 구독. 값이 바뀔 때만 리렌더링되며,
// 컴포넌트는 렌더 중 service getter를 호출해 최신 파생 데이터를 계산한다.
export function useStoreVersion(): number {
  return useSyncExternalStore(
    subscribe,
    getVersion,
    () => 0 // 서버 스냅샷 (SSR 안전)
  );
}
