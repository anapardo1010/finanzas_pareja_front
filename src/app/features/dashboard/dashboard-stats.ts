import { Transaction } from '../../core/models';

/**
 * Cálculos del dashboard. Todo trabaja con meses 'YYYY-MM' tomados directo del texto de la fecha
 * (antes se usaba new Date(fecha), y en México los gastos del día 1 caían en el mes anterior).
 */

export interface MonthStats {
  ym: string;
  /** Todo lo que se compró en el mes (cualquier forma de pago). Es el "gastado". */
  spent: number;
  /** Ingresos del mes. */
  income: number;
  /** Dinero que salió de cuentas: gastos con débito/efectivo + pagos de tarjeta. */
  outflow: number;
  /** Compras hechas con tarjeta de crédito. */
  cardPurchases: number;
  /** income - outflow */
  net: number;
  count: number;
}

export interface CategorySlice {
  name: string;
  amount: number;
  /** % del gastado del mes (las categorías suman 100%). */
  percent: number;
  /** Variación contra el mes anterior en %, o null si el mes anterior no tuvo gasto en ella. */
  change: number | null;
}

export interface Pace {
  avg: number;
  /** Gastado / promedio (0–∞). */
  ratio: number;
  /** Qué parte del mes ya pasó (0–1); null para meses que ya terminaron. */
  monthElapsed: number | null;
  verdict: 'above' | 'normal' | 'below' | 'none';
}

export interface PersonSplit {
  shared: number;
  people: { userId: number; amount: number }[];
}

export function monthOf(date: string): string {
  return (date || '').slice(0, 7);
}

export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const total = y * 12 + (m - 1) + delta;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

/** Los `count` meses que terminan en `endYm`, del más antiguo al más reciente. */
export function monthRange(endYm: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => shiftMonth(endYm, i - count + 1));
}

export function monthStats(txs: Transaction[], ym: string, creditCardIds: Set<number>): MonthStats {
  const inMonth = txs.filter(t => monthOf(t.date) === ym);
  const sum = (list: Transaction[]) => list.reduce((s, t) => s + Number(t.amount || 0), 0);
  const expenses = inMonth.filter(t => t.transactionType === 'EXPENSE');
  const income = sum(inMonth.filter(t => t.transactionType === 'INCOME'));
  const outflow = sum(inMonth.filter(t =>
    t.transactionType === 'CREDIT_PAYMENT' ||
    (t.transactionType === 'EXPENSE' && !creditCardIds.has(t.paymentMethodId))));
  return {
    ym,
    spent: sum(expenses),
    income,
    outflow,
    cardPurchases: sum(expenses.filter(t => creditCardIds.has(t.paymentMethodId))),
    net: income - outflow,
    count: inMonth.length
  };
}

export function categoryBreakdown(txs: Transaction[], ym: string, categoryName: (id?: number) => string,
                                  limit = 6): CategorySlice[] {
  const totals = (month: string) => {
    const map = new Map<string, number>();
    txs.filter(t => t.transactionType === 'EXPENSE' && monthOf(t.date) === month)
      .forEach(t => {
        const name = categoryName(t.categoryId);
        map.set(name, (map.get(name) ?? 0) + Number(t.amount || 0));
      });
    return map;
  };
  const current = totals(ym);
  const previous = totals(shiftMonth(ym, -1));
  const total = [...current.values()].reduce((s, v) => s + v, 0);
  if (total === 0) return [];

  return [...current.entries()]
    .map(([name, amount]) => {
      const before = previous.get(name) ?? 0;
      return {
        name,
        amount,
        percent: (amount / total) * 100,
        change: before > 0 ? ((amount - before) / before) * 100 : null
      };
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

/**
 * Compara lo gastado en el mes contra el promedio de los meses anteriores.
 * En el mes en curso también considera qué tanto del mes ha pasado.
 */
export function pace(spent: number, previousSpent: number[], ym: string, today: Date = new Date()): Pace {
  const withData = previousSpent.filter(v => v > 0);
  const avg = withData.length ? withData.reduce((s, v) => s + v, 0) / withData.length : 0;
  const currentYm = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const monthElapsed = ym === currentYm ? today.getDate() / daysInMonth : null;

  if (avg === 0) return { avg, ratio: 0, monthElapsed, verdict: 'none' };
  const ratio = spent / avg;
  const expected = monthElapsed ?? 1;
  const verdict = ratio > expected + 0.1 ? 'above' : ratio < expected - 0.1 ? 'below' : 'normal';
  return { avg, ratio, monthElapsed, verdict };
}

/** Gastado del mes repartido en compartido y lo personal de cada quien. */
export function personSplit(txs: Transaction[], ym: string): PersonSplit {
  const expenses = txs.filter(t => t.transactionType === 'EXPENSE' && monthOf(t.date) === ym);
  const people = new Map<number, number>();
  let shared = 0;
  for (const t of expenses) {
    const amount = Number(t.amount || 0);
    if (t.isShared) shared += amount;
    else people.set(t.userId, (people.get(t.userId) ?? 0) + amount);
  }
  return {
    shared,
    people: [...people.entries()].map(([userId, amount]) => ({ userId, amount })).sort((a, b) => b.amount - a.amount)
  };
}

/** "Noviembre 2026" */
export function monthLabel(ym: string, style: 'long' | 'short' = 'long'): string {
  const [y, m] = ym.split('-').map(Number);
  const text = new Date(y, m - 1, 15).toLocaleDateString('es-MX',
    style === 'long' ? { month: 'long', year: 'numeric' } : { month: 'short', year: '2-digit' });
  const clean = text.replace('.', '').replace(' de ', ' ');
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}
