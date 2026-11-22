import {
  CardPeriod,
  parseLocalDate,
  periodOptionLabel,
  periodState,
  periodStatusText,
  periodsNewestFirst,
  pickCurrentPeriod,
  shortDate
} from './card-periods';

function period(start: string, end: string, payment: string, paid = false): CardPeriod {
  return { periodId: `${start}_${end}`, startDate: start, endDate: end, paymentDate: payment, paid };
}

// Tarjeta con corte el 14 y pago el 4 del mes siguiente
const PERIODS: CardPeriod[] = [
  period('2026-11-15', '2026-12-14', '2027-01-04'), // en curso
  period('2025-12-15', '2026-01-14', '2026-02-04'), // muy antiguo, sin marcar
  period('2026-10-15', '2026-11-14', '2026-12-04'), // ya cortó: el que toca pagar
  period('2026-09-15', '2026-10-14', '2026-11-04', true)
];

describe('card periods', () => {
  it('picks the most recent period that already cut, not the oldest unpaid one', () => {
    expect(pickCurrentPeriod(PERIODS, '2026-11-21')!.endDate).toBe('2026-11-14');
  });

  it('on cut day the period is still open, so the previous one is shown', () => {
    expect(pickCurrentPeriod(PERIODS, '2026-11-14')!.endDate).toBe('2026-10-14');
  });

  it('falls back to the newest period when none has cut yet', () => {
    expect(pickCurrentPeriod([PERIODS[0]], '2026-11-21')!.endDate).toBe('2026-12-14');
    expect(pickCurrentPeriod([], '2026-11-21')).toBeNull();
  });

  it('lists periods newest first', () => {
    expect(periodsNewestFirst(PERIODS).map(p => p.endDate))
      .toEqual(['2026-12-14', '2026-11-14', '2026-10-14', '2026-01-14']);
  });

  it('computes state and status text', () => {
    const today = '2026-11-21';
    expect(periodState(PERIODS[0], today)).toBe('open');
    expect(periodState(PERIODS[2], today)).toBe('due');
    expect(periodState(PERIODS[1], today)).toBe('overdue');
    expect(periodState(PERIODS[3], today)).toBe('paid');

    expect(periodStatusText(PERIODS[2], today)).toBe('Pagar en 13 días');
    expect(periodStatusText(PERIODS[2], '2026-12-04')).toBe('Se paga hoy');
    expect(periodStatusText(PERIODS[2], '2026-12-05')).toBe('Venció hace 1 día');
    expect(periodStatusText(PERIODS[0], today)).toBe('Corta en 23 días');
    expect(periodStatusText(PERIODS[3], today)).toBe('Pagado');
  });

  it('formats dates without shifting a day back', () => {
    expect(parseLocalDate('2026-11-14').getDate()).toBe(14);
    expect(shortDate('2026-11-14')).toContain('14');
    expect(periodOptionLabel(PERIODS[2], '2026-11-21')).toContain('corte 14');
    expect(periodOptionLabel(PERIODS[2], '2026-11-21')).toContain('Por pagar');
  });
});
