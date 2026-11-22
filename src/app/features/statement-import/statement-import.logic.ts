import { Transaction } from '../../core/models';

/**
 * Lógica de la importación de estados de cuenta (todo ocurre en el navegador):
 * 1. Leer la respuesta que el usuario copia de su Claude personal.
 * 2. Convertirla en filas de revisión con sugerencias.
 */

export type Direction = 'CARGO' | 'ABONO';

export const MOVEMENT_KINDS = [
  'COMPRA', 'PAGO_TARJETA', 'MENSUALIDAD_MSI', 'COMISION', 'INTERES', 'DEVOLUCION',
  'DEPOSITO', 'RETIRO', 'TRANSFERENCIA_ENVIADA', 'TRANSFERENCIA_RECIBIDA', 'OTRO'
] as const;
export type MovementKind = typeof MOVEMENT_KINDS[number];

export interface ExtractedMovement {
  date: string;
  description: string;
  merchant: string;
  amount: number;
  direction: Direction;
  kind: MovementKind;
  installmentNumber: number;
  installmentTotal: number;
  originalAmount: number;
}

export interface ExtractedStatement {
  bank: string;
  periodStart: string;
  periodEnd: string;
  movements: ExtractedMovement[];
}

export interface ParseResult {
  statement: ExtractedStatement;
  /** Movimientos que venían incompletos (sin fecha válida o sin monto) y se omitieron. */
  skipped: number;
}

export type RowStatus = 'PENDING' | 'DISCARDED' | 'IMPORTED';
export type RowFlag = 'POSIBLE_DUPLICADO' | 'PAGO_TARJETA' | 'MSI_PREVIO' | null;

export interface ReviewRow {
  id: number;
  date: string;
  description: string;
  merchantKey: string | null;
  amount: number;
  direction: Direction;
  movementKind: MovementKind;
  flag: RowFlag;
  status: RowStatus;
  transactionType: 'EXPENSE' | 'INCOME';
  isShared: boolean;
  userId: number | null;
  categoryId: number | null;
  hasInstallments: boolean;
  totalInstallments: number | null;
  installmentNumber: number | null;
  /** true si tipo/pareja/categoría se copiaron de una transacción anterior del mismo comercio. */
  fromHistory: boolean;
  /** Error del último intento de importación de esta fila. */
  error: string | null;
}

export interface BuildContext {
  /** Dueño de la tarjeta: se sugiere como quien pagó. */
  ownerUserId: number | null;
  /** Transacciones ya registradas en esta tarjeta, en fechas cercanas al periodo. */
  existingOnCard: Transaction[];
  /** Historial reciente del tenant, para copiar cómo clasificas cada comercio. */
  history: Transaction[];
}

const DUPLICATE_DAYS_TOLERANCE = 3;
const INCOME_KINDS: MovementKind[] = ['DEVOLUCION', 'DEPOSITO', 'TRANSFERENCIA_RECIBIDA'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// =============================================================================
// 1. Leer la respuesta de Claude
// =============================================================================

export function parseClaudeResponse(text: string): ParseResult {
  const json = extractJson(text);
  let data: any;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('No se pudo leer la respuesta. Copia la respuesta completa de Claude (el bloque que empieza con { ).');
  }

  const rawMovements: any[] | null = Array.isArray(data) ? data
    : Array.isArray(data?.movements) ? data.movements
    : null;
  if (!rawMovements) {
    throw new Error('La respuesta no trae la lista de movimientos ("movements"). Pídele a Claude que siga las instrucciones.');
  }

  const movements: ExtractedMovement[] = [];
  let skipped = 0;
  for (const raw of rawMovements) {
    const movement = toMovement(raw);
    if (movement) movements.push(movement);
    else skipped++;
  }
  if (movements.length === 0) {
    throw new Error('No se encontraron movimientos válidos en la respuesta.');
  }

  return {
    statement: {
      bank: asText(data?.bank),
      periodStart: isValidDate(data?.periodStart) ? data.periodStart : '',
      periodEnd: isValidDate(data?.periodEnd) ? data.periodEnd : '',
      movements
    },
    skipped
  };
}

/** Saca el JSON aunque venga dentro de ```json ... ``` o con texto alrededor. */
function extractJson(text: string): string {
  const trimmed = (text || '').trim();
  if (!trimmed) throw new Error('Pega la respuesta de Claude.');
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = trimmed.search(/[{[]/);
  const end = Math.max(trimmed.lastIndexOf('}'), trimmed.lastIndexOf(']'));
  if (start === -1 || end <= start) {
    throw new Error('No se encontró la lista de movimientos en lo que pegaste.');
  }
  return trimmed.slice(start, end + 1);
}

function toMovement(raw: any): ExtractedMovement | null {
  if (!raw || typeof raw !== 'object') return null;
  const date = asText(raw.date);
  let amount = parseAmount(raw.amount);
  if (!isValidDate(date) || amount === null || amount === 0) return null;

  const kind: MovementKind = MOVEMENT_KINDS.includes(raw.kind) ? raw.kind : 'OTRO';
  let direction: Direction | null = raw.direction === 'CARGO' || raw.direction === 'ABONO' ? raw.direction : null;
  if (amount < 0) {
    amount = -amount;
    direction = direction ?? 'ABONO';
  }
  if (!direction) direction = INCOME_KINDS.includes(kind) || kind === 'PAGO_TARJETA' ? 'ABONO' : 'CARGO';

  const description = asText(raw.description) || asText(raw.merchant) || 'Movimiento';
  return {
    date,
    description: description.slice(0, 500),
    merchant: asText(raw.merchant) || description,
    amount: round2(amount),
    direction,
    kind,
    installmentNumber: toInt(raw.installmentNumber),
    installmentTotal: toInt(raw.installmentTotal),
    originalAmount: Math.abs(parseAmount(raw.originalAmount) ?? 0)
  };
}

// =============================================================================
// 2. Construir filas con sugerencias
// =============================================================================

export function buildRows(statement: ExtractedStatement, ctx: BuildContext): ReviewRow[] {
  const rows = statement.movements.map((m, index) => toRow(m, index + 1, ctx.ownerUserId));
  applyHistory(rows, ctx.history);
  flagDuplicates(rows, ctx.existingOnCard);
  return rows;
}

function toRow(m: ExtractedMovement, id: number, ownerUserId: number | null): ReviewRow {
  const row: ReviewRow = {
    id,
    date: m.date,
    description: m.description,
    merchantKey: normalizeMerchant(m.merchant || m.description),
    amount: m.amount,
    direction: m.direction,
    movementKind: m.kind,
    flag: null,
    status: 'PENDING',
    transactionType: m.direction === 'ABONO' ? 'INCOME' : 'EXPENSE',
    isShared: false,
    userId: ownerUserId,
    categoryId: null,
    hasInstallments: false,
    totalInstallments: null,
    installmentNumber: null,
    fromHistory: false,
    error: null
  };

  if (m.kind === 'PAGO_TARJETA') {
    // Los pagos de tarjeta se registran en el módulo de pagos de tarjeta, no como gasto/ingreso
    row.status = 'DISCARDED';
    row.flag = 'PAGO_TARJETA';
  } else if (m.kind === 'MENSUALIDAD_MSI') {
    row.transactionType = 'EXPENSE';
    row.installmentNumber = m.installmentNumber > 0 ? m.installmentNumber : null;
    const total = m.installmentTotal;
    if (m.installmentNumber <= 1 && total >= 2 && total <= 36) {
      // Primera mensualidad: se registra la compra completa a MSI y la app genera las cuotas
      row.amount = m.originalAmount > 0 ? round2(m.originalAmount) : round2(m.amount * total);
      row.hasInstallments = true;
      row.totalInstallments = total;
    } else {
      // Mensualidad de una compra anterior: esas cuotas ya existen en la app
      row.totalInstallments = total > 0 ? total : null;
      row.status = 'DISCARDED';
      row.flag = 'MSI_PREVIO';
    }
  }
  return row;
}

/** Copia cómo clasificaste antes el mismo comercio (la transacción más reciente que coincida). */
function applyHistory(rows: ReviewRow[], history: Transaction[]): void {
  const candidates = history
    .filter(t => t.transactionType === 'EXPENSE' || t.transactionType === 'INCOME')
    .map(t => ({ key: normalizeMerchant(t.description), tx: t }))
    .filter((c): c is { key: string; tx: Transaction } => !!c.key)
    .sort((a, b) => (b.tx.date || '').localeCompare(a.tx.date || ''));

  for (const row of rows) {
    if (row.flag || !row.merchantKey) continue;
    const match = candidates.find(c => sameMerchant(row.merchantKey!, c.key));
    if (!match) continue;
    row.transactionType = match.tx.transactionType as 'EXPENSE' | 'INCOME';
    row.isShared = !!match.tx.isShared;
    row.categoryId = match.tx.categoryId ?? null;
    if (row.transactionType === 'INCOME') row.hasInstallments = false;
    row.fromHistory = true;
  }
}

function sameMerchant(a: string, b: string): boolean {
  if (a === b) return true;
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  // Evita coincidencias falsas con palabras muy cortas ("PAGO", "SPEI")
  return shorter.length >= 5 && (` ${longer} `).includes(` ${shorter} `);
}

/** Marca como posible duplicado lo que ya está registrado en la tarjeta con el mismo monto y fecha cercana. */
function flagDuplicates(rows: ReviewRow[], existing: Transaction[]): void {
  const pool = [...existing];
  for (const row of rows) {
    if (row.status !== 'PENDING') continue;
    const index = pool.findIndex(t =>
      Math.round(Number(t.amount) * 100) === Math.round(row.amount * 100) &&
      Math.abs(daysBetween(t.date, row.date)) <= DUPLICATE_DAYS_TOLERANCE);
    if (index >= 0) {
      pool.splice(index, 1); // una transacción solo "cubre" un movimiento
      row.status = 'DISCARDED';
      row.flag = 'POSIBLE_DUPLICADO';
    }
  }
}

/**
 * Al cambiar de tarjeta durante la revisión: quita las marcas de duplicado anteriores
 * y vuelve a buscar duplicados contra las transacciones de la nueva tarjeta.
 * El dueño de la tarjeta anterior, si seguía como "quién pagó", pasa a ser el de la nueva.
 */
export function reassignCard(rows: ReviewRow[], existingOnNewCard: Transaction[],
                             previousOwnerId: number | null, newOwnerId: number | null): ReviewRow[] {
  const updated = rows.map(r => {
    if (r.status === 'IMPORTED') return { ...r };
    const row = { ...r };
    if (row.flag === 'POSIBLE_DUPLICADO') {
      row.flag = null;
      row.status = 'PENDING';
    }
    if (newOwnerId !== null && row.userId === previousOwnerId) row.userId = newOwnerId;
    return row;
  });
  flagDuplicates(updated, existingOnNewCard);
  return updated;
}

/** Rango de fechas (con tolerancia) de las filas en revisión, para buscar duplicados. */
export function rowsSearchRange(rows: ReviewRow[]): { startDate: string; endDate: string } {
  const dates = rows.map(r => r.date).sort();
  return {
    startDate: shiftDate(dates[0], -DUPLICATE_DAYS_TOLERANCE),
    endDate: shiftDate(dates[dates.length - 1], DUPLICATE_DAYS_TOLERANCE)
  };
}

/** Rango de fechas (con tolerancia) para buscar duplicados en la tarjeta. */
export function duplicateSearchRange(statement: ExtractedStatement): { startDate: string; endDate: string } {
  const dates = statement.movements.map(m => m.date).sort();
  return {
    startDate: shiftDate(dates[0], -DUPLICATE_DAYS_TOLERANCE),
    endDate: shiftDate(dates[dates.length - 1], DUPLICATE_DAYS_TOLERANCE)
  };
}

// =============================================================================
// Utilidades
// =============================================================================

/** "Café La Estación #12" → "CAFE LA ESTACION" */
export function normalizeMerchant(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized || null;
}

export function shiftDate(isoDate: string, days: number): string {
  const d = new Date(`${isoDate.slice(0, 10)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const ta = Date.parse(`${(a || '').slice(0, 10)}T12:00:00Z`);
  const tb = Date.parse(`${(b || '').slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return Number.POSITIVE_INFINITY;
  return Math.round((ta - tb) / 86_400_000);
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function parseAmount(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[$,\s]/g, '');
    if (!cleaned) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function toInt(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0;
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
