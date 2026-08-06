import { NextRequest, NextResponse } from "next/server";
import { serverStore } from "@/lib/serverStore";
import { requireSelf } from "@/lib/apiAuth";
import { encryptSensitive, maskAccountNumber } from "@/lib/sensitiveData";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { sellerId, withdrawAccount } = await req.json();
    if (!sellerId || !withdrawAccount?.bankName || !withdrawAccount?.accountNumber || !withdrawAccount?.accountHolder) {
      return NextResponse.json({ error: "은행과 계좌 정보를 모두 입력해주세요." }, { status: 400 });
    }
    const auth = requireSelf(req, sellerId);
    if (auth.response) return auth.response;
    const accountNumber = String(withdrawAccount.accountNumber).replace(/[^0-9-]/g, "");
    const bankName = String(withdrawAccount.bankName).trim().slice(0, 30);
    const accountHolder = String(withdrawAccount.accountHolder).trim().slice(0, 50);
    if (accountNumber.replace(/\D/g, "").length < 8 || !bankName || !accountHolder) {
      return NextResponse.json({ error: "계좌 정보를 확인해주세요." }, { status: 400 });
    }

    const count = await serverStore.runExclusive(() => {
      const withdrawable = serverStore.getSettlementsBySeller(sellerId).filter((settlement) => settlement.status === "withdrawable");
      if (withdrawable.length === 0) return 0;
      const now = Date.now();
      const encrypted = encryptSensitive({ bankName, accountNumber, accountHolder });
      withdrawable.forEach((settlement) => serverStore.updateSettlement(settlement.id, {
        status: "withdrawal_requested",
        withdrawRequestedAt: now,
        withdrawAccountEncrypted: encrypted,
        withdrawAccount: { bankName, accountNumber: maskAccountNumber(accountNumber), accountHolder },
      }));
      return withdrawable.length;
    });
    if (!count) return NextResponse.json({ error: "출금 가능한 정산이 없습니다." }, { status: 400 });
    serverStore.broadcast("settlement_withdrawal_requested", { sellerId, count });
    return NextResponse.json({ ok: true, count });
  } catch {
    return NextResponse.json({ error: "출금 신청을 처리할 수 없습니다." }, { status: 400 });
  }
}
