'use client';

import * as Toast from '@radix-ui/react-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Mail,
  Route,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { ApiError } from '../../../lib/api/client';

type LoginFormValues = {
  email: string;
  password: string;
};

type ToastState = {
  id: number;
  open: boolean;
  title: string;
  description: string;
  variant: 'warning' | 'error';
};

export default function SignInPage() {
  const t = useTranslations();
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const schema = z.object({
    email: z
      .string()
      .trim()
      .min(1, t('auth.emailRequired'))
      .email(t('auth.emailInvalid')),
    password: z
      .string()
      .min(1, t('auth.passwordRequired'))
      .min(6, t('auth.passwordMin')),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>({
    id: 0,
    open: false,
    title: '',
    description: '',
    variant: 'warning',
  });

  const featureCards = [
    {
      icon: ShieldCheck,
      title: t('auth.highlights.secureTitle'),
      description: t('auth.highlights.secureDescription'),
    },
    {
      icon: Route,
      title: t('auth.highlights.trackingTitle'),
      description: t('auth.highlights.trackingDescription'),
    },
    {
      icon: Truck,
      title: t('auth.highlights.fleetTitle'),
      description: t('auth.highlights.fleetDescription'),
    },
  ];

  const metricCards = [
    { value: '24/7', label: t('auth.metrics.liveOps') },
    { value: '99.9%', label: t('auth.metrics.fleetHealth') },
    { value: '3x', label: t('auth.metrics.securityLayers') },
  ];

  const showToast = (nextToast: Omit<ToastState, 'id' | 'open'>) => {
    setToast({
      ...nextToast,
      id: Date.now(),
      open: true,
    });
  };

  const resolveErrorMessage = (error: unknown) => {
    if (error instanceof ApiError) {
      if (error.code === 'VALIDATION_ERROR') {
        return t('auth.validationDescription');
      }

      if (error.status === 401) {
        return t('auth.invalidCredentials');
      }

      return error.message || t('auth.loginFailed');
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return t('auth.loginFailed');
  };

  const handleValidSubmit = async (values: LoginFormValues) => {
    setFormError(null);
    try {
      await login(values.email, values.password);
      router.replace('/');
    } catch (error) {
      const message = resolveErrorMessage(error);
      setFormError(message);
      showToast({
        title: t('auth.loginErrorTitle'),
        description: message,
        variant: 'error',
      });
    }
  };

  const handleInvalidSubmit = () => {
    setFormError(null);
    showToast({
      title: t('auth.validationTitle'),
      description: t('auth.validationDescription'),
      variant: 'warning',
    });
  };

  const emailError = errors.email?.message;
  const passwordError = errors.password?.message;
  const buttonDisabled = isLoading || isSubmitting;
  const toastVariantClasses =
    toast.variant === 'error'
      ? 'border-red-200 bg-red-50/95 text-red-950'
      : 'border-amber-200 bg-amber-50/95 text-amber-950';

  const fieldBaseClasses =
    'flex items-center gap-3 rounded-xl border bg-white/80 px-4 py-2.5 shadow-sm transition-all duration-200 focus-within:-translate-y-0.5 focus-within:border-[color:var(--color-brand)] focus-within:bg-white focus-within:shadow-[0_12px_26px_rgba(12,107,88,0.12)]';

  return (
    <Toast.Provider swipeDirection="right">
      <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(12,107,88,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(201,95,58,0.12),transparent_28%),linear-gradient(180deg,#f7f3eb_0%,#f1ece4_100%)] px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-5">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-16 top-14 h-52 w-52 rounded-full bg-[rgba(12,107,88,0.16)] blur-3xl animate-pulse" />
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[rgba(201,95,58,0.14)] blur-3xl animate-pulse" />
          <div className="absolute bottom-10 left-1/3 h-44 w-44 rounded-full bg-white/40 blur-3xl" />
        </div>

        <div className="relative mx-auto flex min-h-[calc(100dvh-2rem)] max-w-6xl items-center">
          <div className="grid w-full overflow-hidden rounded-[28px] border border-white/50 bg-white/55 shadow-[0_40px_120px_rgba(23,18,14,0.18)] backdrop-blur-xl lg:grid-cols-[minmax(0,1fr)_390px]">
            <section className="relative overflow-hidden bg-[linear-gradient(155deg,#0d1721_0%,#0f3f3b_48%,#125e52_100%)] px-5 py-6 text-white sm:px-7 sm:py-7 lg:px-8 lg:py-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_45%)]" />
              <div className="absolute -bottom-16 right-0 h-56 w-56 rounded-full border border-white/10" />
              <div className="absolute bottom-10 right-12 h-24 w-24 rounded-full border border-white/15" />

              <div className="relative flex h-full flex-col">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold tracking-[0.28em] text-white/80 uppercase">
                  <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_20px_rgba(110,231,183,0.9)]" />
                  {t('auth.panelEyebrow')}
                </div>

                <div className="mt-6 max-w-2xl">
                  <p className="text-sm font-medium text-white/70">{t('welcome')}</p>
                  <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl lg:text-[2.65rem]">
                    {t('auth.title')}
                  </h1>
                  <p className="mt-4 max-w-lg text-sm leading-6 text-white/78 sm:text-base">
                    {t('auth.intro')}
                  </p>
                </div>

                <div className="mt-6 grid gap-2 sm:grid-cols-3">
                  {metricCards.map((metric) => (
                    <div
                      key={metric.label}
                      className="rounded-xl border border-white/10 bg-white/10 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-transform duration-300 hover:-translate-y-1"
                    >
                      <div className="text-xl font-semibold text-white">{metric.value}</div>
                      <div className="mt-1.5 text-xs text-white/70">{metric.label}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 grid gap-2 sm:grid-cols-2">
                  {featureCards.map(({ icon: Icon, title, description }) => (
                    <div
                      key={title}
                      className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/8 px-3 py-3 transition-all duration-300 hover:bg-white/12"
                    >
                      <div className="mt-0.5 rounded-xl bg-white/12 p-2.5">
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">{title}</div>
                        <div className="mt-1 text-xs leading-5 text-white/72">
                          {description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-5">
                  <div className="rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-xs leading-5 text-white/70">
                    {t('auth.supportingNote')}
                  </div>
                </div>
              </div>
            </section>

            <section className="px-5 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
              <div className="mx-auto flex h-full max-w-[340px] flex-col">
                <div className="inline-flex w-fit items-center rounded-full bg-[rgba(12,107,88,0.08)] px-3 py-1 text-xs font-semibold tracking-[0.22em] text-[color:var(--color-brand)] uppercase">
                  {t('auth.formEyebrow')}
                </div>

                <div className="mt-5">
                  <h2 className="text-2xl font-semibold text-[color:var(--color-ink)]">
                    {t('sign_in')}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted)]">
                    {t('auth.formIntro')}
                  </p>
                </div>

                <form
                  onSubmit={handleSubmit(handleValidSubmit, handleInvalidSubmit)}
                  noValidate
                  className="mt-6 space-y-4"
                >
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[color:var(--color-ink)]">
                      {t('email')}
                    </label>
                    <div
                      className={`${fieldBaseClasses} ${
                        emailError ? 'border-red-300 bg-red-50/80' : 'border-[color:var(--color-border)]'
                      }`}
                    >
                      <Mail className={`h-5 w-5 shrink-0 ${emailError ? 'text-red-500' : 'text-[color:var(--color-muted)]'}`} />
                      <input
                        type="email"
                        autoComplete="email"
                        placeholder={t('auth.emailPlaceholder')}
                        aria-invalid={Boolean(emailError)}
                        {...register('email')}
                        className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] text-[color:var(--color-ink)] outline-none placeholder:text-[color:var(--color-muted)]/70"
                      />
                    </div>
                    <p className="mt-1.5 text-[11px] text-[color:var(--color-muted)]">
                      {emailError || t('auth.emailHint')}
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[color:var(--color-ink)]">
                      {t('password')}
                    </label>
                    <div
                      className={`${fieldBaseClasses} ${
                        passwordError ? 'border-red-300 bg-red-50/80' : 'border-[color:var(--color-border)]'
                      }`}
                    >
                      <ShieldCheck
                        className={`h-5 w-5 shrink-0 ${
                          passwordError ? 'text-red-500' : 'text-[color:var(--color-muted)]'
                        }`}
                      />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder={t('auth.passwordPlaceholder')}
                        aria-invalid={Boolean(passwordError)}
                        {...register('password')}
                        className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] text-[color:var(--color-ink)] outline-none placeholder:text-[color:var(--color-muted)]/70"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((current) => !current)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--color-muted)] transition-colors hover:bg-black/5 hover:text-[color:var(--color-ink)]"
                        aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="mt-1.5 text-[11px] text-[color:var(--color-muted)]">
                      {passwordError || t('auth.passwordHint')}
                    </p>
                  </div>

                  {formError ? (
                    <div className="rounded-xl border border-red-200 bg-red-50/90 px-3 py-2.5 text-xs leading-5 text-red-700">
                      {formError}
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={buttonDisabled}
                    className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#0c6b58_0%,#0f8a72_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(12,107,88,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_42px_rgba(12,107,88,0.28)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                  >
                    <span>{buttonDisabled ? t('loading') : t('auth.submit')}</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
                  </button>
                </form>

                <div className="mt-5 rounded-xl border border-[color:var(--color-border)] bg-white/70 px-4 py-3 text-xs leading-5 text-[color:var(--color-muted)]">
                  {t('auth.secureNote')}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      <Toast.Root
        key={toast.id}
        open={toast.open}
        onOpenChange={(open) => setToast((currentToast) => ({ ...currentToast, open }))}
        className={`rounded-xl border p-4 shadow-lg ${toastVariantClasses}`}
      >
        <Toast.Title className="text-sm font-semibold">{toast.title}</Toast.Title>
        <Toast.Description className="mt-1 text-sm opacity-90">
          {toast.description}
        </Toast.Description>
      </Toast.Root>
      <Toast.Viewport className="fixed right-4 top-4 z-50 flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none" />
    </Toast.Provider>
  );
}
