// utils/budget.ts
export function getRemarketingShare(investmentBRL: number): number {
  if (investmentBRL < 1000) return 0.10;      // até R$ 1.000 → 10%
  if (investmentBRL <= 3000) return 0.20;     // R$ 1.000–3.000 → 20%
  return 0.30;                                 // acima de R$ 3.000 → 30%
}




