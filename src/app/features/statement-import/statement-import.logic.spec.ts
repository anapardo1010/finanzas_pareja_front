import { Transaction } from '../../core/models';
import { buildRows, duplicateSearchRange, normalizeMerchant, parseClaudeResponse, reassignCard, rowsSearchRange } from './statement-import.logic';

function tx(partial: Partial<Transaction>): Transaction {
  return {
    id: 1, tenantId: 1, userId: 7, paymentMethodId: 3, description: '', amount: 0, date: '2026-11-01',
    isShared: false, transactionType: 'EXPENSE', hasInstallments: false, totalInstallments: 1,
    createdAt: '', updatedAt: '', ...partial
  };
}

const CLAUDE_REPLY = `Aquí están los movimientos:

\`\`\`json
{
  "bank": "Banregio",
  "periodStart": "2026-10-15",
  "periodEnd": "2026-11-14",
  "movements": [
    { "date": "2026-11-01", "description": "SU PAGO GRACIAS", "merchant": "Banregio", "amount": 1250.50,
      "direction": "ABONO", "kind": "PAGO_TARJETA", "installmentNumber": 0, "installmentTotal": 0, "originalAmount": 0 },
    { "date": "2026-11-06", "description": "FARMACIA DEL CENTRO", "merchant": "Farmacia del Centro", "amount": "2,400.00",
      "direction": "CARGO", "kind": "COMPRA", "installmentNumber": 0, "installmentTotal": 0, "originalAmount": 0 },
    { "date": "2026-11-02", "description": "CAFETERIA ESQUINA", "merchant": "Cafeteria Esquina", "amount": 6,
      "direction": "CARGO", "kind": "COMPRA", "installmentNumber": 0, "installmentTotal": 0, "originalAmount": 0 },
    { "date": "2026-10-20", "description": "LIVERPOOL", "merchant": "Liverpool", "amount": 500,
      "direction": "CARGO", "kind": "MENSUALIDAD_MSI", "installmentNumber": 1, "installmentTotal": 6, "originalAmount": 3000 },
    { "date": "2026-10-21", "description": "COPPEL", "merchant": "Coppel", "amount": 250,
      "direction": "CARGO", "kind": "MENSUALIDAD_MSI", "installmentNumber": 4, "installmentTotal": 12, "originalAmount": 0 },
    { "date": "2026-11-03", "description": "DEVOLUCION AMAZON", "merchant": "Amazon", "amount": 300,
      "direction": "ABONO", "kind": "DEVOLUCION", "installmentNumber": 0, "installmentTotal": 0, "originalAmount": 0 },
    { "date": "06 NOV", "description": "SIN FECHA", "merchant": "x", "amount": 10,
      "direction": "CARGO", "kind": "COMPRA", "installmentNumber": 0, "installmentTotal": 0, "originalAmount": 0 }
  ]
}
\`\`\`

¿Necesitas algo más?`;

describe('statement-import logic', () => {
  describe('parseClaudeResponse', () => {
    it('reads the JSON block even with text around it and skips invalid movements', () => {
      const { statement, skipped } = parseClaudeResponse(CLAUDE_REPLY);
      expect(statement.bank).toBe('Banregio');
      expect(statement.periodEnd).toBe('2026-11-14');
      expect(statement.movements.length).toBe(6);
      expect(skipped).toBe(1);
      expect(statement.movements[1].amount).toBe(2400);
    });

    it('reads a bare JSON object', () => {
      const { statement } = parseClaudeResponse(
        '{"bank":"Nu","periodStart":"","periodEnd":"","movements":[{"date":"2026-09-06","description":"Gimnasio","merchant":"Gimnasio","amount":850,"direction":"CARGO","kind":"COMPRA","installmentNumber":0,"installmentTotal":0,"originalAmount":0}]}');
      expect(statement.movements.length).toBe(1);
    });

    it('treats negative amounts as credits', () => {
      const { statement } = parseClaudeResponse('{"movements":[{"date":"2026-09-06","description":"Abono","amount":-50}]}');
      expect(statement.movements[0].amount).toBe(50);
      expect(statement.movements[0].direction).toBe('ABONO');
      expect(statement.movements[0].kind).toBe('OTRO');
    });

    it('gives a clear error for empty, non-JSON, or JSON without movements', () => {
      expect(() => parseClaudeResponse('   ')).toThrowError(/Pega la respuesta/);
      expect(() => parseClaudeResponse('no encontré nada')).toThrowError(/No se encontró/);
      expect(() => parseClaudeResponse('{"bank": "BBVA"}')).toThrowError(/movements/);
      expect(() => parseClaudeResponse('{"movements": [ {"date": "x"} ]}')).toThrowError(/No se encontraron movimientos/);
      expect(() => parseClaudeResponse('{ esto no es json }')).toThrowError(/No se pudo leer/);
    });
  });

  describe('buildRows', () => {
    const { statement } = parseClaudeResponse(CLAUDE_REPLY);

    it('suggests types and discards card payments and previous MSI installments', () => {
      const rows = buildRows(statement, { ownerUserId: 7, existingOnCard: [], history: [] });
      const byDesc = (d: string) => rows.find(r => r.description === d)!;

      expect(byDesc('SU PAGO GRACIAS').status).toBe('DISCARDED');
      expect(byDesc('SU PAGO GRACIAS').flag).toBe('PAGO_TARJETA');

      const purchase = byDesc('FARMACIA DEL CENTRO');
      expect(purchase.status).toBe('PENDING');
      expect(purchase.transactionType).toBe('EXPENSE');
      expect(purchase.userId).toBe(7);
      expect(purchase.isShared).toBeFalse();

      const newMsi = byDesc('LIVERPOOL');
      expect(newMsi.status).toBe('PENDING');
      expect(newMsi.hasInstallments).toBeTrue();
      expect(newMsi.totalInstallments).toBe(6);
      expect(newMsi.amount).toBe(3000);

      expect(byDesc('COPPEL').status).toBe('DISCARDED');
      expect(byDesc('COPPEL').flag).toBe('MSI_PREVIO');

      expect(byDesc('DEVOLUCION AMAZON').transactionType).toBe('INCOME');
    });

    it('flags a possible duplicate once per existing transaction on the card', () => {
      const existing = [tx({ description: 'Cafe', amount: 6, date: '2026-11-04' })];
      const rows = buildRows(statement, { ownerUserId: 7, existingOnCard: existing, history: [] });
      const metro = rows.find(r => r.description === 'CAFETERIA ESQUINA')!;
      expect(metro.flag).toBe('POSIBLE_DUPLICADO');
      expect(metro.status).toBe('DISCARDED');
      expect(rows.filter(r => r.flag === 'POSIBLE_DUPLICADO').length).toBe(1);
    });

    it('copies shared/category from the most recent matching transaction in history', () => {
      const history = [
        tx({ description: 'Farmacia del centro', isShared: false, categoryId: 1, date: '2026-01-10' }),
        tx({ description: 'FARMACIA DEL', isShared: true, categoryId: 9, date: '2026-08-01' }),
        tx({ description: 'Pago', transactionType: 'CREDIT_PAYMENT', isShared: true, date: '2026-09-01' })
      ];
      const rows = buildRows(statement, { ownerUserId: 7, existingOnCard: [], history });
      const purchase = rows.find(r => r.description === 'FARMACIA DEL CENTRO')!;
      expect(purchase.fromHistory).toBeTrue();
      expect(purchase.isShared).toBeTrue();
      expect(purchase.categoryId).toBe(9);

      // Las filas marcadas (pago a tarjeta) no toman sugerencias del historial
      expect(rows.find(r => r.flag === 'PAGO_TARJETA')!.fromHistory).toBeFalse();
    });

    it('does not match short generic words', () => {
      const history = [tx({ description: 'Uber', isShared: true, categoryId: 4 })];
      const { statement: s } = parseClaudeResponse(
        '{"movements":[{"date":"2026-11-01","description":"UBER EATS PEDIDO","merchant":"Uber Eats","amount":120,"direction":"CARGO","kind":"COMPRA"}]}');
      const rows = buildRows(s, { ownerUserId: 7, existingOnCard: [], history });
      expect(rows[0].fromHistory).toBeFalse();
    });
  });

  describe('reassignCard', () => {
    const { statement } = parseClaudeResponse(CLAUDE_REPLY);

    it('re-checks duplicates against the new card and moves the default payer', () => {
      const oldCardExisting = [tx({ description: 'Cafe', amount: 6, date: '2026-11-03' })];
      const rows = buildRows(statement, { ownerUserId: 7, existingOnCard: oldCardExisting, history: [] });
      expect(rows.find(r => r.description === 'CAFETERIA ESQUINA')!.flag).toBe('POSIBLE_DUPLICADO');
      rows.find(r => r.description === 'DEVOLUCION AMAZON')!.userId = 8; // elegido a mano

      const newCardExisting = [tx({ description: 'Farmacia', amount: 2400, date: '2026-11-05' })];
      const updated = reassignCard(rows, newCardExisting, 7, 9);
      const byDesc = (d: string) => updated.find(r => r.description === d)!;

      expect(byDesc('CAFETERIA ESQUINA').flag).toBeNull();
      expect(byDesc('CAFETERIA ESQUINA').status).toBe('PENDING');
      expect(byDesc('FARMACIA DEL CENTRO').flag).toBe('POSIBLE_DUPLICADO');
      expect(byDesc('FARMACIA DEL CENTRO').status).toBe('DISCARDED');
      expect(byDesc('CAFETERIA ESQUINA').userId).toBe(9);
      expect(byDesc('DEVOLUCION AMAZON').userId).toBe(8);
      // Las demás marcas no cambian
      expect(byDesc('SU PAGO GRACIAS').flag).toBe('PAGO_TARJETA');
      expect(byDesc('COPPEL').flag).toBe('MSI_PREVIO');
      // No modifica las filas originales
      expect(rows.find(r => r.description === 'CAFETERIA ESQUINA')!.userId).toBe(7);
    });

    it('computes the search range from the rows', () => {
      const rows = buildRows(statement, { ownerUserId: 7, existingOnCard: [], history: [] });
      expect(rowsSearchRange(rows)).toEqual({ startDate: '2026-10-17', endDate: '2026-11-09' });
    });
  });

  it('normalizes merchant names and computes the duplicate search range', () => {
    expect(normalizeMerchant('Café La Estación #12')).toBe('CAFE LA ESTACION');
    expect(normalizeMerchant(' 123 ')).toBeNull();
    const { statement } = parseClaudeResponse(CLAUDE_REPLY);
    expect(duplicateSearchRange(statement)).toEqual({ startDate: '2026-10-17', endDate: '2026-11-09' });
  });
});
