/**
 * Instrucciones que el usuario copia y pega en su Claude personal (claude.ai) junto con el PDF.
 * También se pueden guardar como instrucciones de un Proyecto para no copiarlas cada vez.
 * El formato de respuesta debe coincidir con lo que lee parseClaudeResponse().
 */
export const CLAUDE_INSTRUCTIONS = `Te voy a adjuntar el PDF de un estado de cuenta bancario mexicano (tarjeta de crédito o cuenta de débito: BBVA, Banamex, Banregio, Nu u otro banco). Extrae sus movimientos para importarlos a mi app de finanzas.

QUÉ EXTRAER
- Cada movimiento individual de las secciones de detalle de movimientos (por ejemplo "CARGOS, ABONOS Y COMPRAS REGULARES", "DESGLOSE DE MOVIMIENTOS", "Detalle de movimientos", "COMPRAS Y CARGOS DIFERIDOS A MESES"), incluyendo los de tarjetas adicionales o virtuales.
- Las mensualidades de compras a meses van como kind "MENSUALIDAD_MSI", con el importe de la mensualidad del periodo, el número de mensualidad, el total de mensualidades y el monto original si aparece.
- Si un mismo movimiento aparece en dos secciones, inclúyelo una sola vez.

QUÉ NO EXTRAER
- Resúmenes, totales, subtotales, saldos, límite de crédito, pago mínimo, pago para no generar intereses.
- Tablas informativas: simulaciones de pago, cálculo de intereses, distribución del último pago, CAT, notas, glosario.
- Movimientos de programas de recompensas, puntos o cashback que no afectan el saldo.

CÓMO LLENAR CADA CAMPO
- date: fecha de operación (no la de cargo) en formato YYYY-MM-DD. Si no trae año, dedúcelo del periodo (cuidado con periodos de diciembre a enero).
- description: el texto del movimiento sin números de tarjeta, referencias largas ni RFC. Ej.: "Titular #4000123412341234 FARMACIA DEL CENTRO FAC010101AB1" → "FARMACIA DEL CENTRO".
- merchant: nombre corto del comercio o contraparte, igual para todas las compras del mismo comercio (ej. "Oxxo", "Amazon", "Uber").
- amount: número positivo, sin signo ni símbolo de pesos, con punto decimal (ej. 1250.50).
- direction: "CARGO" si es gasto o sale dinero (compras, comisiones, intereses, retiros, transferencias enviadas); "ABONO" si es pago a la tarjeta, devolución o entra dinero.
- kind: uno de COMPRA, PAGO_TARJETA, MENSUALIDAD_MSI, COMISION, INTERES, DEVOLUCION, DEPOSITO, RETIRO, TRANSFERENCIA_ENVIADA, TRANSFERENCIA_RECIBIDA, OTRO. Usa PAGO_TARJETA para pagos a una tarjeta de crédito (ej. "SU PAGO GRACIAS").
- installmentNumber, installmentTotal, originalAmount: solo para MENSUALIDAD_MSI (ej. "3 de 12" → 3 y 12); 0 en cualquier otro caso.
- bank, periodStart, periodEnd: datos del encabezado del estado de cuenta; "" si no aparecen.

FORMATO DE RESPUESTA
Responde únicamente con un bloque de código JSON con esta estructura, sin texto antes ni después, y sin omitir ningún movimiento:

\`\`\`json
{
  "bank": "Banregio",
  "periodStart": "2026-10-15",
  "periodEnd": "2026-11-14",
  "movements": [
    {
      "date": "2026-11-06",
      "description": "FARMACIA DEL CENTRO",
      "merchant": "Farmacia del Centro",
      "amount": 2400.00,
      "direction": "CARGO",
      "kind": "COMPRA",
      "installmentNumber": 0,
      "installmentTotal": 0,
      "originalAmount": 0
    }
  ]
}
\`\`\``;
