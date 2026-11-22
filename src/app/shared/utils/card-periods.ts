/**
 * Utilidades para los periodos (cortes) de las tarjetas de crédito en Reportes.
 * Las fechas llegan del backend como 'YYYY-MM-DD'.
 */

export interface CardPeriod {
  periodId: string;
  startDate: string;   // inicio del periodo
  endDate: string;     // fecha de corte
  paymentDate: string; // fecha límite de pago
  paymentStatus?: string;
  paid: boolean;
}

export type PeriodState = 'paid' | 'open' | 'due' | 'overdue';

/** Fecha local de hoy en formato YYYY-MM-DD (sin desfase por zona horaria). */
export function todayIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** 'YYYY-MM-DD' → Date local a mediodía (evita que se muestre un día antes en México). */
export function parseLocalDate(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12);
}

/**
 * Periodo que se muestra por defecto: el último que ya cortó (el que estás por pagar).
 * Si ninguno ha cortado todavía, el más reciente.
 */
export function pickCurrentPeriod(periods: CardPeriod[], today: string = todayIso()): CardPeriod | null {
  if (!periods.length) return null;
  const sorted = sortByEndDate(periods);
  const cut = sorted.filter(p => p.endDate < today);
  return cut.length ? cut[cut.length - 1] : sorted[sorted.length - 1];
}

/** Periodos del más reciente al más antiguo, para el desplegable. */
export function periodsNewestFirst(periods: CardPeriod[]): CardPeriod[] {
  return sortByEndDate(periods).reverse();
}

export function periodState(period: CardPeriod, today: string = todayIso()): PeriodState {
  if (period.paid) return 'paid';
  if (period.endDate >= today) return 'open';
  if (period.paymentDate < today) return 'overdue';
  return 'due';
}

/** "Nov 2026" a partir de la fecha de corte. */
export function periodMonthLabel(period: CardPeriod): string {
  const label = parseLocalDate(period.endDate).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' });
  return capitalize(label.replace('.', ''));
}

/** Texto de cada opción del desplegable. */
export function periodOptionLabel(period: CardPeriod, today: string = todayIso()): string {
  const state = periodState(period, today);
  const stateText = state === 'paid' ? 'Pagado'
    : state === 'open' ? 'En curso'
    : state === 'overdue' ? 'Vencido'
    : 'Por pagar';
  return `${periodMonthLabel(period)} · corte ${shortDate(period.endDate)} · ${stateText}`;
}

/** Texto corto del estado para la tarjeta, con días restantes. */
export function periodStatusText(period: CardPeriod, today: string = todayIso()): string {
  const state = periodState(period, today);
  if (state === 'paid') return 'Pagado';
  if (state === 'open') {
    const days = daysBetween(today, period.endDate);
    return days === 0 ? 'Corta hoy' : `Corta en ${days} día${days === 1 ? '' : 's'}`;
  }
  const days = daysBetween(today, period.paymentDate);
  if (state === 'overdue') return `Venció hace ${-days} día${days === -1 ? '' : 's'}`;
  return days === 0 ? 'Se paga hoy' : `Pagar en ${days} día${days === 1 ? '' : 's'}`;
}

/** "14 nov" */
export function shortDate(value: string): string {
  return parseLocalDate(value).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', '');
}

function sortByEndDate(periods: CardPeriod[]): CardPeriod[] {
  return [...periods].sort((a, b) => a.endDate.localeCompare(b.endDate));
}

function daysBetween(from: string, to: string): number {
  return Math.round((parseLocalDate(to).getTime() - parseLocalDate(from).getTime()) / 86_400_000);
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
