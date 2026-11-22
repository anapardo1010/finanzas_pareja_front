import { Transaction } from '../../core/models';
import { categoryBreakdown, monthLabel, monthRange, monthStats, pace, personSplit, shiftMonth } from './dashboard-stats';

function tx(p: Partial<Transaction>): Transaction {
  return {
    id: 1, tenantId: 1, userId: 7, paymentMethodId: 1, description: '', amount: 0, date: '2026-11-10',
    isShared: false, transactionType: 'EXPENSE', hasInstallments: false, totalInstallments: 1,
    createdAt: '', updatedAt: '', ...p
  };
}

const CREDIT = new Set([9]); // método 9 = tarjeta de crédito; 1 = débito

const TXS: Transaction[] = [
  tx({ date: '2026-11-01', amount: 100, paymentMethodId: 1, categoryId: 1 }),           // día 1: debe contar en noviembre
  tx({ date: '2026-11-15', amount: 300, paymentMethodId: 9, categoryId: 2, isShared: true }),
  tx({ date: '2026-11-20', amount: 50, paymentMethodId: 9, categoryId: 1, userId: 8 }),
  tx({ date: '2026-11-05', amount: 1000, transactionType: 'INCOME' }),
  tx({ date: '2026-11-06', amount: 200, transactionType: 'CREDIT_PAYMENT', paymentMethodId: 1 }),
  tx({ date: '2026-10-31', amount: 75, paymentMethodId: 1, categoryId: 1 }),
  tx({ date: '2026-10-10', amount: 400, paymentMethodId: 9, categoryId: 2 })
];

const names = (id?: number) => (id === 1 ? 'Súper' : id === 2 ? 'Restaurantes' : 'Sin categoría');

describe('dashboard stats', () => {
  it('handles month arithmetic across years', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(monthRange('2026-02', 3)).toEqual(['2025-12', '2026-01', '2026-02']);
  });

  it('computes month stats without shifting the 1st into the previous month', () => {
    const nov = monthStats(TXS, '2026-11', CREDIT);
    expect(nov.spent).toBe(450);          // 100 + 300 + 50
    expect(nov.cardPurchases).toBe(350);   // 300 + 50
    expect(nov.outflow).toBe(300);         // 100 débito + 200 pago de tarjeta
    expect(nov.income).toBe(1000);
    expect(nov.net).toBe(700);
    expect(monthStats(TXS, '2026-10', CREDIT).spent).toBe(475);
  });

  it('category percentages add up to 100 and compare with the previous month', () => {
    const cats = categoryBreakdown(TXS, '2026-11', names);
    const total = cats.reduce((s, c) => s + c.percent, 0);
    expect(Math.round(total)).toBe(100);
    const rest = cats.find(c => c.name === 'Restaurantes')!;
    expect(rest.amount).toBe(300);
    expect(rest.change).toBe(-25); // 400 → 300
    const sup = cats.find(c => c.name === 'Súper')!;
    expect(sup.amount).toBe(150);
    expect(sup.change).toBe(100); // 75 → 150
  });

  it('judges the pace against the average and how much of the month has passed', () => {
    const today = new Date(2026, 10, 15); // 15 nov: la mitad del mes
    expect(pace(500, [1000, 1000, 1000], '2026-11', today).verdict).toBe('normal');
    expect(pace(900, [1000, 1000, 1000], '2026-11', today).verdict).toBe('above');
    expect(pace(100, [1000, 1000, 1000], '2026-11', today).verdict).toBe('below');
    expect(pace(1000, [1000, 0, 1000], '2026-10', today).monthElapsed).toBeNull();
    expect(pace(1000, [1000, 0, 1000], '2026-10', today).avg).toBe(1000); // ignora meses vacíos
    expect(pace(100, [0, 0, 0], '2026-11', today).verdict).toBe('none');
  });

  it('splits spending into shared and each person', () => {
    const split = personSplit(TXS, '2026-11');
    expect(split.shared).toBe(300);
    expect(split.people).toEqual([{ userId: 7, amount: 100 }, { userId: 8, amount: 50 }]);
  });

  it('formats month labels', () => {
    expect(monthLabel('2026-11')).toBe('Noviembre 2026');
  });
});
