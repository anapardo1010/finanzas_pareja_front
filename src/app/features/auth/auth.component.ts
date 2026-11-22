import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideAngularModule, Mail, Lock, Eye, EyeOff, User, ArrowRight } from 'lucide-angular';
import { AuthService } from 'src/app/core/services/auth.service';
import { TokenService } from 'src/app/core/services/token.service';
import { LoginRequest, RegisterRequest } from 'src/app/core/models/auth.model';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss']
})
export class AuthComponent {
  readonly icons = { Mail, Lock, Eye, EyeOff, User, ArrowRight };

  isLogin = true;
  loading = false;
  showPassword = false;
  error: string | null = null;

  loginForm: LoginRequest = { email: '', password: '' };
  registerForm: RegisterRequest = { name: '', email: '', password: '', tenantId: undefined };

  constructor(
    private authService: AuthService,
    private tokenService: TokenService,
    private router: Router
  ) {}

  setMode(login: boolean) {
    if (this.isLogin === login) return;
    this.isLogin = login;
    this.error = null;
    this.showPassword = false;
  }

  login() {
    if (this.loading) return;
    this.loading = true;
    this.error = null;

    this.authService.login(this.loginForm).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/main/dashboard']);
      },
      error: (err) => {
        this.error = this.errorMessage(err, 'Correo o contraseña incorrectos.');
        this.loading = false;
      }
    });
  }

  register() {
    if (this.loading) return;
    this.loading = true;
    this.error = null;

    this.authService.register(this.registerForm).subscribe({
      next: (res) => {
        this.tokenService.setToken(res.token);
        this.loading = false;
        this.router.navigate(['/main/dashboard']);
      },
      error: (err) => {
        this.error = this.errorMessage(err, 'No se pudo crear la cuenta. Intenta de nuevo.');
        this.loading = false;
      }
    });
  }

  /** El interceptor envuelve el error; el mensaje del backend viene en originalError.error.message. */
  private errorMessage(err: any, fallback: string): string {
    return err?.originalError?.error?.message || err?.error?.message || fallback;
  }
}
