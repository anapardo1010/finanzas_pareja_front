import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule, Plus, FileUp, ChevronLeft, ChevronRight, ArrowRight, CreditCard } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { FinanceReportService } from '../../core/services/finance-report.service';
import { TransactionService } from '../../core/services/transaction.service';
import { CategoryService } from '../../core/services/category.service';
import { PaymentMethodService } from '../../core/services/payment-method.service';
import { UserService } from '../../core/services/user.service';
import { Category, PaymentMethod, Transaction, User } from '../../core/models';
import {
  CardPeriod,
  parseLocalDate,
  periodState,
  shortDate,
  todayIso
} from '../../shared/utils/card-periods';
import {
  categoryBreakdown,
  monthLabel,
  monthRange,
  monthStats,
  pace,
  personSplit,
  shiftMonth
} from './dashboard-stats';

/** Un pago de tarjeta próximo (corte ya hecho por pagar, o corte en curso). */
interface UpcomingPayment {
  cardName: string;
  cutDate: string;
  paymentDate: string;
  amount: number;
  installments: number;
  state: 'open' | 'due' | 'paid';
  daysToPay: number;
}

const UPCOMING_WINDOW_DAYS = 40;
const HISTORY_MONTHS = 6;
const AVERAGE_MONTHS = 3;
const SHARED_COLOR = '#14b8a6';
const PERSON_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#8b5cf6'];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly financeReportService = inject(FinanceReportService);
  private readonly transactionService = inject(TransactionService);
  private readonly categoryService = inject(CategoryService);
  private readonly paymentMethodService = inject(PaymentMethodService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);

  readonly icons = { Plus, FileUp, ChevronLeft, ChevronRight, ArrowRight, CreditCard };
  readonly sharedColor = SHARED_COLOR;
  readonly currentYm = todayIso().slice(0, 7);

  userName = signal('');
  selectedYm = signal(this.currentYm);
  loading = signal(true);
  transactions = signal<Transaction[]>([]);
  categories = signal<Category[]>([]);
  paymentMethods = signal<PaymentMethod[]>([]);
  users = signal<User[]>([]);

  loadingPayments = signal(true);
  upcoming = signal<UpcomingPayment[]>([]);

  private readonly creditCardIds = computed(() =>
    new Set(this.paymentMethods().filter(m => m.accountType === 'CREDIT').map(m => m.id)));

  readonly monthTitle = computed(() => monthLabel(this.selectedYm()));
  readonly isCurrentMonth = computed(() => this.selectedYm() === this.currentYm);

  readonly stats = computed(() => monthStats(this.transactions(), this.selectedYm(), this.creditCardIds()));

  readonly pace = computed(() => {
    const previous = monthRange(shiftMonth(this.selectedYm(), -1), AVERAGE_MONTHS)
      .map(ym => monthStats(this.transactions(), ym, this.creditCardIds()).spent);
    return pace(this.stats().spent, previous, this.selectedYm());
  });

  readonly split = computed(() => {
    const s = personSplit(this.transactions(), this.selectedYm());
    const total = s.shared + s.people.reduce((acc, p) => acc + p.amount, 0);
    const segments = [
      { label: 'Compartido', amount: s.shared, color: SHARED_COLOR },
      ...s.people.map(p => ({ label: this.userLabel(p.userId), amount: p.amount, color: this.personColor(p.userId) }))
    ].filter(x => x.amount > 0);
    return { total, segments };
  });

  readonly categoriesOfMonth = computed(() =>
    categoryBreakdown(this.transactions(), this.selectedYm(),
      id => this.categories().find(c => c.id === id)?.name ?? 'Sin categoría'));

  readonly history = computed(() =>
    monthRange(this.selectedYm(), HISTORY_MONTHS).reverse()
      .map(ym => ({ ...monthStats(this.transactions(), ym, this.creditCardIds()), label: monthLabel(ym, 'short') })));

  readonly historyMax = computed(() =>
    Math.max(1, ...this.history().map(h => Math.max(h.income, h.outflow))));

  ngOnInit(): void {
    const user = this.authService.currentUser();
    this.userName.set(user?.name?.split(' ')[0] ?? '');
    if (user?.id) {
      this.userService.getUserById(user.id).subscribe({
        next: u => this.userName.set(u.name?.split(' ')[0] ?? ''),
        error: () => {}
      });
    }
    this.loadMonthData();
    this.loadUpcomingPayments();
  }

  // ===========================================================================
  // Navegación de mes
  // ===========================================================================

  changeMonth(delta: number): void {
    const next = shiftMonth(this.selectedYm(), delta);
    if (next > this.currentYm) return;
    this.selectedYm.set(next);
    this.loadMonthData();
  }

  // ===========================================================================
  // Datos
  // ===========================================================================

  /** Trae los 6 meses que terminan en el mes elegido (más uno extra para comparar categorías y promedio). */
  async loadMonthData(): Promise<void> {
    const tenantId = this.authService.getTenantId();
    if (!tenantId) return;
    this.loading.set(true);

    const firstYm = shiftMonth(this.selectedYm(), -HISTORY_MONTHS);
    const [ly, lm] = this.selectedYm().split('-').map(Number);
    const lastDay = new Date(ly, lm, 0).getDate();

    try {
      const [txs, cats, methods, users] = await Promise.all([
        firstValueFrom(this.transactionService.getTransactionsByDateRange(
          tenantId, `${firstYm}-01`, `${this.selectedYm()}-${String(lastDay).padStart(2, '0')}`)),
        this.categories().length ? Promise.resolve(null) : firstValueFrom(this.categoryService.getByTenant(tenantId, 0, 200)),
        this.paymentMethods().length ? Promise.resolve(null) : firstValueFrom(this.paymentMethodService.getByTenant(tenantId, 0, 100)),
        this.users().length ? Promise.resolve(null) : firstValueFrom(this.userService.getUsersByTenant(tenantId))
      ]);
      this.transactions.set(txs ?? []);
      if (cats) this.categories.set(cats.content ?? []);
      if (methods) this.paymentMethods.set(methods.content ?? []);
      if (users) this.users.set(users ?? []);
    } catch (e) {
      console.error('Error cargando el dashboard', e);
    } finally {
      this.loading.set(false);
    }
  }

  /** Pagos de tarjeta de los próximos días: siempre la situación de hoy, sin importar el mes elegido. */
  async loadUpcomingPayments(): Promise<void> {
    const tenantId = this.authService.getTenantId();
    if (!tenantId) return;
    this.loadingPayments.set(true);
    try {
      let methods = this.paymentMethods();
      if (!methods.length) {
        methods = (await firstValueFrom(this.paymentMethodService.getByTenant(tenantId, 0, 100))).content ?? [];
        this.paymentMethods.set(methods);
      }
      const today = todayIso();
      const limit = this.addDays(today, UPCOMING_WINDOW_DAYS);
      const cards = methods.filter(m => m.accountType === 'CREDIT' && m.isActive !== false);

      const perCard = await Promise.all(cards.map(async card => {
        try {
          const periods = (await firstValueFrom(this.financeReportService.getAvailablePeriods(card.id))) as CardPeriod[];
          const soon = (periods || []).filter(p => p.paymentDate >= today && p.paymentDate <= limit);
          return await Promise.all(soon.map(async p => {
            const data = await firstValueFrom(this.financeReportService.getCreditCardProportionalPayment(card.id, p.periodId));
            const state = periodState(p, today);
            return {
              cardName: card.alias ? `${card.bankName} · ${card.alias}` : card.bankName,
              cutDate: p.endDate,
              paymentDate: p.paymentDate,
              amount: Number(data?.totalDue ?? 0),
              installments: Number(data?.pendingInstallments ?? 0),
              state: state === 'overdue' ? 'due' : state,
              daysToPay: this.daysBetween(today, p.paymentDate)
            } as UpcomingPayment;
          }));
        } catch {
          return [];
        }
      }));

      this.upcoming.set(perCard.flat().sort((a, b) => a.paymentDate.localeCompare(b.paymentDate)));
    } finally {
      this.loadingPayments.set(false);
    }
  }

  // ===========================================================================
  // Helpers de plantilla
  // ===========================================================================

  paymentHint(p: UpcomingPayment): string {
    if (p.state === 'paid') return 'Pagado';
    if (p.state === 'open') return `Corte en curso · cierra el ${shortDate(p.cutDate)}`;
    if (p.daysToPay === 0) return 'Se paga hoy';
    return `Pagar en ${p.daysToPay} día${p.daysToPay === 1 ? '' : 's'}`;
  }

  urgency(p: UpcomingPayment): 'paid' | 'urgent' | 'soon' | 'later' {
    if (p.state === 'paid') return 'paid';
    if (p.state === 'open') return 'later';
    return p.daysToPay <= 3 ? 'urgent' : p.daysToPay <= 10 ? 'soon' : 'later';
  }

  formatShort = (iso: string) => shortDate(iso);

  dayOfMonth(iso: string): number {
    return parseLocalDate(iso).getDate();
  }

  monthAbbrev(iso: string): string {
    return parseLocalDate(iso).toLocaleDateString('es-MX', { month: 'short' }).replace('.', '');
  }

  paceVerdictText(): string {
    const p = this.pace();
    if (p.verdict === 'none') return 'Todavía no hay meses anteriores para comparar.';
    const pct = Math.round(p.ratio * 100);
    if (p.monthElapsed === null) {
      return p.verdict === 'above' ? `Gastaron ${pct}% de lo habitual: más que otros meses.`
        : p.verdict === 'below' ? `Gastaron ${pct}% de lo habitual: menos que otros meses.`
        : `Gastaron ${pct}% de lo habitual: un mes normal.`;
    }
    const elapsed = Math.round(p.monthElapsed * 100);
    return p.verdict === 'above' ? `Llevan ${pct}% de lo habitual y va el ${elapsed}% del mes: van por arriba.`
      : p.verdict === 'below' ? `Llevan ${pct}% de lo habitual y va el ${elapsed}% del mes: van bien.`
      : `Llevan ${pct}% de lo habitual y va el ${elapsed}% del mes: van en lo normal.`;
  }

  barPercent(value: number, max: number): number {
    return max > 0 ? Math.min(100, (value / max) * 100) : 0;
  }

  userLabel(userId: number): string {
    return this.users().find(u => u.id === userId)?.name?.split(' ')[0] ?? 'Persona';
  }

  personColor(userId: number): string {
    const ids = this.users().map(u => u.id).sort((a, b) => a - b);
    const index = ids.indexOf(userId);
    return PERSON_COLORS[(index >= 0 ? index : 0) % PERSON_COLORS.length];
  }

  go(path: string): void {
    this.router.navigate([path]);
  }

  private addDays(iso: string, days: number): string {
    const d = parseLocalDate(iso);
    d.setDate(d.getDate() + days);
    return todayIso(d);
  }

  private daysBetween(from: string, to: string): number {
    return Math.round((parseLocalDate(to).getTime() - parseLocalDate(from).getTime()) / 86_400_000);
  }
}
