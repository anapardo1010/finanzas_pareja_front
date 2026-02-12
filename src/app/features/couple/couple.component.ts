import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { User } from '../../core/models';
import { LucideAngularModule, Edit2, UserPlus, Info, X } from 'lucide-angular';

@Component({
  selector: 'app-couple',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './couple.component.html',
  styleUrl: './couple.component.scss'
})
export class CoupleComponent implements OnInit {
  // Iconos
  readonly icons = { Edit2, UserPlus, Info, X };

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);

  users = signal<User[]>([]);
  loading = signal(false);
  showInviteForm = signal(false);
  showEditForm = signal(false);
  selectedUser = signal<User | null>(null);

  inviteForm!: FormGroup;
  editForm!: FormGroup;

  ngOnInit(): void {
    this.initForms();
    this.loadUsers();
  }

  initForms(): void {
    this.inviteForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.editForm = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.email]], // Quitamos required para que no bloquee si no es válido
      contributionPercentage: [0, [Validators.required, Validators.min(0), Validators.max(100)]]
    });
  }

  loadUsers(): void {
    const tenantId = this.authService.getTenantId();
    if (!tenantId) return;

    this.loading.set(true);
    this.userService.getUsersByTenant(tenantId).subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  openEditForm(user: User): void {
    this.selectedUser.set(user);
    this.editForm.patchValue({
      name: user.name,
      email: user.email,
      contributionPercentage: user.contributionPercentage ?? 0
    });
    this.showEditForm.set(true);
  }

  onEditSubmit(): void {
    if (this.editForm.invalid) return;
    const user = this.selectedUser();
    const tenantId = this.authService.getTenantId();
    
    if (user && tenantId) {
      this.userService.updateUser(user.id, { ...this.editForm.value, tenantId }).subscribe({
        next: () => {
          this.loadUsers();
          this.closeEditForm();
        }
      });
    }
  }

    onInviteSubmit(): void {
      if (this.inviteForm.invalid) return;
      const tenantId = this.authService.getTenantId();
      if (!tenantId) {
        console.error("No se encontró el Tenant ID");
        return;
      }
      this.loading.set(true);
      const payload = {
        ...this.inviteForm.value,
        tenantId: Number(tenantId)
      };
      this.authService.registerInvite(payload).subscribe({
        next: () => {
          this.loadUsers();
          this.closeInviteForm();
          this.loading.set(false);
        },
        error: (err) => {
          console.error("Error al invitar:", err);
          this.loading.set(false);
          // Aquí podrías añadir una notificación de error
        }
      });
    }

  // ... (onInviteSubmit, openInviteForm y close forms se mantienen similares pero usando .set(false))
  openInviteForm() { this.inviteForm.reset(); this.showInviteForm.set(true); }
  closeInviteForm() { this.showInviteForm.set(false); }
  closeEditForm() { this.showEditForm.set(false); this.selectedUser.set(null); }
  getTotalPercentage = () => this.users().reduce((sum, u) => sum + (u.contributionPercentage || 0), 0);
}