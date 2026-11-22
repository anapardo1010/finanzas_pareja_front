import { Transaction } from '../../core/models';

/**
 * Cálculos del dashboard. Todo trabaja con meses 'YYYY-MM' tomados directo del texto de la fecha
 * (antes se usaba new Date(fecha), y en México los gastos del día 1 caían en el mes anterior).
 */

export interface MonthStats {
  ym: string;
  /**
   * Gasto real: el dinero que salió de las cuentas en el mes
   * (gastos con débito/efectivo + pagos de tarjeta). Las compras con tarjeta
   * cuentan hasta que se paga la tarjeta.
   */
  spent: number;
  /** Gastos pagados con débito o efectivo. */
  directSpent: number;
  /** Pagos hechos a tarjetas de crédito. */
  cardPayments: number;
  /** Ingresos del mes. */
  income: number;
  /** Todas las compras del mes, con cualquier forma de pago (base de categorías y reparto). */
  purchases: number;
  /** Compras hechas con tarjeta de crédito (se pagarán después). */
  cardPurchases: number;
  /** income - spent */
  net: number;
  count: number;
}

export interface CategorySlice {
  name: string;
  amount: number;
  /** % de las compras del mes (las categorías suman 100%). */
  percent: number;
  /** Variación contra el mes anterior en %, o null si el mes anterior no tuvo gasto en ella. */
  change: number | null;
}

export interface Pace {
  avg: number;
  /** Gastado / promedio (0–∞). */
  ratio: number;
  /** true si el mes todavía no termina. */
  inProgress: boolean;
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
  const directSpent = sum(expenses.filter(t => !creditCardIds.has(t.paymentMethodId)));
  const cardPayments = sum(inMonth.filter(t => t.transactionType === 'CREDIT_PAYMENT'));
  const spent = directSpent + cardPayments;
  return {
    ym,
    spent,
    directSpent,
    cardPayments,
    income,
    purchases: sum(expenses),
    cardPurchases: sum(expenses.filter(t => creditCardIds.has(t.paymentMethodId))),
    net: income - spent,
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
 * No se compara contra "qué tanto del mes ha pasado": el gasto real incluye pagos de tarjeta,
 * que llegan de golpe en ciertas fechas, y eso daría falsas alarmas a inicio de mes.
 * En el mes en curso solo se avisa cuando ya se superó lo habitual.
 */
export function pace(spent: number, previousSpent: number[], ym: string, today: Date = new Date()): Pace {
  const withData = previousSpent.filter(v => v > 0);
  const avg = withData.length ? withData.reduce((s, v) => s + v, 0) / withData.length : 0;
  const currentYm = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const inProgress = ym === currentYm;

  if (avg === 0) return { avg, ratio: 0, inProgress, verdict: 'none' };
  const ratio = spent / avg;
  const verdict = ratio > 1.1 ? 'above' : (!inProgress && ratio < 0.9) ? 'below' : 'normal';
  return { avg, ratio, inProgress, verdict };
}

/** Compras del mes repartidas en compartido y lo personal de cada quien. */
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
