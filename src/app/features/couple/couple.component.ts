import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';
import { User } from '../../core/models';
import { LucideAngularModule, Edit2 } from 'lucide-angular';

@Component({
  selector: 'app-couple',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule],
  templateUrl: './couple.component.html',
  styleUrl: './couple.component.scss'
})
export class CoupleComponent implements OnInit {
    readonly Edit2 = Edit2;
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);

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
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.editForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      contributionPercentage: [50, [Validators.required, Validators.min(0), Validators.max(100)]]
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
      error: (err) => {
        console.error('Error loading users:', err);
        this.loading.set(false);
      }
    });
  }

  openInviteForm(): void {
    this.inviteForm.reset({
      name: '',
      email: '',
      password: ''
    });
    this.showInviteForm.set(true);
  }

  openEditForm(user: User): void {
    this.selectedUser.set(user);
    this.editForm.patchValue({
      name: user.name,
      email: user.email,
      contributionPercentage: user.contributionPercentage || 50
    });
    this.showEditForm.set(true);
  }

  onInviteSubmit(): void {
    if (this.inviteForm.invalid) return;

    const tenantId = this.authService.getTenantId();
    if (!tenantId) return;

    const formValue = this.inviteForm.value;
    const request = {
      ...formValue,
      tenantId
    };

    this.authService.registerInvite(request).subscribe({
      next: () => {
        this.loadUsers();
        this.closeInviteForm();
        alert('¡Invitación enviada! Tu pareja puede iniciar sesión con ese email y contraseña.');
      },
      error: (err) => {
        console.error('Error inviting user:', err);
        alert('Error al enviar la invitación. Verifica que el email no esté en uso.');
      }
    });
  }

  onEditSubmit(): void {
    if (this.editForm.invalid) return;

    const user = this.selectedUser();
    if (!user) return;

    const tenantId = this.authService.getTenantId();
    if (!tenantId) return;

    const formValue = this.editForm.value;
    const request = {
      tenantId,
      ...formValue
    };

    this.userService.updateUser(user.id, request).subscribe({
      next: () => {
        this.loadUsers();
        this.closeEditForm();
      },
      error: (err) => {
        console.error('Error updating user:', err);
      }
    });
  }

  closeInviteForm(): void {
    this.showInviteForm.set(false);
  }

  closeEditForm(): void {
    this.showEditForm.set(false);
    this.selectedUser.set(null);
  }

  getTotalPercentage(): number {
    return this.users().reduce((sum, user) => sum + (user.contributionPercentage || 0), 0);
  }
}
