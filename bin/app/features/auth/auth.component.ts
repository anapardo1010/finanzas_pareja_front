import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';
import { TokenService } from 'src/app/core/services/token.service';
import { LoginRequest, RegisterRequest } from 'src/app/core/models/auth.model';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss']
})
export class AuthComponent {
  isLogin = true;
  loading = false;
  error: string | null = null;

  loginForm: LoginRequest = { email: '', password: '' };
  registerForm: RegisterRequest = { name: '', email: '', password: '', tenantId: undefined };

  constructor(
    private authService: AuthService, 
    private tokenService: TokenService,
    private router: Router
  ) {}

  switchMode() {
    this.isLogin = !this.isLogin;
    this.error = null;
  }

  login() {
    this.loading = true;
    this.error = null;
    console.log('🔐 Intentando login con:', this.loginForm.email);
    
    this.authService.login(this.loginForm).subscribe({
      next: (res) => {
        console.log('✅ Login exitoso:', res);
        this.loading = false;
        this.router.navigate(['/main/dashboard']);
      },
      error: (err) => {
        console.error('❌ Error en login:', err);
        this.error = err.error?.message || 'Credenciales inválidas';
        this.loading = false;
      }
    });
  }

  register() {
    this.loading = true;
    this.authService.register(this.registerForm).subscribe({
      next: (res) => {
        this.tokenService.setToken(res.token);
        this.loading = false;
        this.router.navigate(['/main/dashboard']);
      },
      error: () => {
        this.error = 'Error al registrar';
        this.loading = false;
      }
    });
  }
}
