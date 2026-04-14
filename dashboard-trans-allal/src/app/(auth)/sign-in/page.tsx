'use client';

import * as Toast from '@radix-ui/react-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle,
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  Mail,
  Route,
  ShieldCheck,
  Truck,
  X,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type KeyboardEvent } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuthStore } from '../../../lib/auth/auth-store';
import { ApiError } from '../../../lib/api/client';
import {
  normalizeAuthRedirectReason,
  normalizeNextPath,
} from '../../../lib/auth/navigation';

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

const NAV_SECTIONS = new Set([
  'overview',
  'companies',
  'drivers',
  'trucks',
  'trips',
  'tracking',
  'alerts',
  'reports',
  'settings',
] as const);

export default function SignInPage() {
  const t = useTranslations();
  const tNav = useTranslations('nav');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading, user, hasHydrated } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const redirectTarget = normalizeNextPath(searchParams.get('next'));
  const redirectReason = normalizeAuthRedirectReason(searchParams.get('reason'));
  const redirectSection = redirectTarget.split(/[?#]/, 1)[0].split('/')[1] ?? '';
  const destinationLabel = NAV_SECTIONS.has(
    redirectSection as (typeof NAV_SECTIONS extends Set<infer T> ? T : never),
  )
    ? tNav(redirectSection as Parameters<typeof tNav>[0])
    : null;
  const redirectReasonTone =
    redirectReason === 'signed-out'
      ? 'border-emerald-200 bg-emerald-50/90 text-emerald-800'
      : 'border-amber-200 bg-amber-50/90 text-amber-900';
  const redirectReasonIcon =
    redirectReason === 'signed-out' ? (
      <ShieldCheck className="h-4 w-4 shrink-0" />
    ) : (
      <AlertTriangle className="h-4 w-4 shrink-0" />
    );
  const redirectReasonTitle = redirectReason
    ? t(`auth.redirectReason.${redirectReason}.title` as Parameters<typeof t>[0])
    : null;
  const redirectReasonDescription = redirectReason
    ? t(
        `auth.redirectReason.${redirectReason}.description` as Parameters<
          typeof t
        >[0],
      )
    : null;

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
    resetField,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    shouldFocusError: true,
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

      if (error.code === 'NETWORK_ERROR' || error.code === 'REQUEST_ABORTED') {
        return t('auth.networkUnavailable');
      }

      if (error.status === 401) {
        return t('auth.invalidCredentials');
      }

      return error.message || t('auth.loginFailed');
    }

    if (error instanceof Error && error.message) {
      if (error.message === 'AUTH_LOGIN_TIMEOUT') {
        return t('auth.connectionTimeout');
      }

      return error.message;
    }

    return t('auth.loginFailed');
  };

  const handleValidSubmit = async (values: LoginFormValues) => {
    setFormError(null);
    try {
      await login(values.email, values.password);
      router.replace(redirectTarget);
    } catch (error) {
      const message = resolveErrorMessage(error);
      setFormError(message);
      resetField('password');
      setFocus('password');
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
  const emailMessageId = 'sign-in-email-message';
  const passwordMessageId = 'sign-in-password-message';
  const formErrorId = 'sign-in-form-error';
  const credentialsDirection = 'ltr';
  const toastVariantClasses =
    toast.variant === 'error'
      ? 'border-red-200 bg-red-50/95 text-red-950'
      : 'border-amber-200 bg-amber-50/95 text-amber-950';
  const toastIconClasses =
    toast.variant === 'error'
      ? 'bg-red-100 text-red-700'
      : 'bg-amber-100 text-amber-700';

  const fieldBaseClasses =
    'flex items-center gap-3 rounded-xl border bg-white/80 px-4 py-2.5 shadow-sm transition-all duration-200 focus-within:-translate-y-0.5 focus-within:border-[color:var(--color-brand)] focus-within:bg-white focus-within:shadow-[0_12px_26px_rgba(12,107,88,0.12)] motion-reduce:transition-none motion-reduce:transform-none';

  const clearFormError = () => {
    if (formError) {
      setFormError(null);
    }
  };

  const emailField = register('email', {
    onChange: clearFormError,
  });

  const passwordField = register('password', {
    onChange: clearFormError,
  });

  const handlePasswordKeyboardState = (
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    setIsCapsLockOn(event.getModifierState('CapsLock'));
  };

  const handleEmailKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.altKey &&
      !event.metaKey &&
      !event.ctrlKey
    ) {
      event.preventDefault();
      setFocus('password');
    }
  };

  useEffect(() => {
    if (hasHydrated && user) {
      router.replace(redirectTarget);
    }
  }, [hasHydrated, redirectTarget, router, user]);

  const authStateScreen = (
    icon: React.ReactNode,
    title: string,
    description: string,
    destinationNote?: string | null,
  ) => (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(12,107,88,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(201,95,58,0.12),transparent_28%),linear-gradient(180deg,#f7f3eb_0%,#f1ece4_100%)] px-3 py-3 sm:px-5 sm:py-4 lg:px-6 lg:py-5">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-16 top-14 h-52 w-52 rounded-full bg-[rgba(12,107,88,0.16)] blur-3xl motion-reduce:animate-none" />
        <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[rgba(201,95,58,0.14)] blur-3xl motion-reduce:animate-none" />
        <div className="absolute bottom-10 left-1/3 h-44 w-44 rounded-full bg-white/40 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100dvh-1.5rem)] max-w-6xl items-center justify-center">
        <div className="w-full max-w-md rounded-[28px] border border-white/50 bg-white/70 p-6 shadow-[0_40px_120px_rgba(23,18,14,0.18)] backdrop-blur-xl sm:p-7">
          <div className="mx-auto flex max-w-sm flex-col items-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(12,107,88,0.1)] text-[color:var(--color-brand)] shadow-[0_10px_30px_rgba(12,107,88,0.12)]">
              {icon}
            </div>
            <div className="mt-5 inline-flex items-center rounded-full bg-[rgba(12,107,88,0.08)] px-3 py-1 text-xs font-semibold tracking-[0.22em] text-[color:var(--color-brand)] uppercase">
              {t('auth.formEyebrow')}
            </div>
            <h1 className="mt-4 text-2xl font-semibold text-[color:var(--color-ink)]">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted)]">
              {description}
            </p>
            {destinationNote ? (
              <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full border border-[rgba(12,107,88,0.14)] bg-[rgba(12,107,88,0.06)] px-3 py-1.5 text-xs font-medium text-[color:var(--color-brand)]">
                <Route className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{destinationNote}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );

  if (!hasHydrated) {
    return authStateScreen(
      <LoaderCircle className="h-6 w-6 animate-spin" />,
      t('dashboard_shell.auth_check_title'),
      t('dashboard_shell.auth_check_description'),
      destinationLabel
        ? t('auth.returningTo', { section: destinationLabel })
        : null,
    );
  }

  if (user) {
    return authStateScreen(
      <ShieldCheck className="h-6 w-6" />,
      t('auth.sessionActiveTitle'),
      t('auth.sessionActiveDescription'),
      destinationLabel
        ? t('auth.returningTo', { section: destinationLabel })
        : null,
    );
  }

  return (
    <Toast.Provider swipeDirection={locale === 'ar' ? 'left' : 'right'}>
      <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(12,107,88,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(201,95,58,0.12),transparent_28%),linear-gradient(180deg,#f7f3eb_0%,#f1ece4_100%)] px-3 py-3 sm:px-5 sm:py-4 lg:px-6 lg:py-5">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-16 top-14 h-52 w-52 rounded-full bg-[rgba(12,107,88,0.16)] blur-3xl animate-pulse motion-reduce:animate-none" />
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-[rgba(201,95,58,0.14)] blur-3xl animate-pulse motion-reduce:animate-none" />
          <div className="absolute bottom-10 left-1/3 h-44 w-44 rounded-full bg-white/40 blur-3xl" />
        </div>

        <div className="relative mx-auto flex min-h-[calc(100dvh-1.5rem)] max-w-6xl items-center">
          <div className="grid w-full overflow-hidden rounded-[28px] border border-white/50 bg-white/55 shadow-[0_40px_120px_rgba(23,18,14,0.18)] backdrop-blur-xl lg:grid-cols-[minmax(0,1fr)_380px]">
            <section className="relative overflow-hidden bg-[linear-gradient(155deg,#0d1721_0%,#0f3f3b_48%,#125e52_100%)] px-5 py-5 text-white sm:px-6 sm:py-6 lg:px-7 lg:py-7">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent_45%)]" />
              <div className="absolute -bottom-16 right-0 h-56 w-56 rounded-full border border-white/10" />
              <div className="absolute bottom-10 right-12 h-24 w-24 rounded-full border border-white/15" />

              <div className="relative flex h-full flex-col">
                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold tracking-[0.28em] text-white/80 uppercase">
                  <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_20px_rgba(110,231,183,0.9)]" />
                  {t('auth.panelEyebrow')}
                </div>

                <div className="mt-5 max-w-2xl">
                  <p className="text-sm font-medium text-white/70">{t('welcome')}</p>
                  <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl lg:text-[2.65rem]">
                    {t('auth.title')}
                  </h1>
                  <p className="mt-4 max-w-lg text-sm leading-6 text-white/78 sm:text-base">
                    {t('auth.intro')}
                  </p>
                </div>

                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  {metricCards.map((metric) => (
                    <div
                      key={metric.label}
                      className="rounded-xl border border-white/10 bg-white/10 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-transform duration-300 hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                    >
                      <div className="text-xl font-semibold text-white">{metric.value}</div>
                      <div className="mt-1.5 text-xs text-white/70">{metric.label}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {featureCards.map(({ icon: Icon, title, description }) => (
                    <div
                      key={title}
                      className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/8 px-3 py-3 transition-all duration-300 hover:bg-white/12 motion-reduce:transition-none"
                    >
                      <div className="mt-0.5 rounded-xl bg-white/12 p-2.5">
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">{title}</div>
                        <div className="mt-1 line-clamp-2 text-xs leading-5 text-white/72">
                          {description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-4 max-xl:hidden">
                  <div className="rounded-xl border border-white/10 bg-black/10 px-4 py-3 text-xs leading-5 text-white/70">
                    {t('auth.supportingNote')}
                  </div>
                </div>
              </div>
            </section>

            <section className="px-5 py-5 sm:px-6 sm:py-6 lg:px-7 lg:py-7">
              <div className="mx-auto flex h-full max-w-[348px] flex-col">
                <div className="inline-flex w-fit items-center rounded-full bg-[rgba(12,107,88,0.08)] px-3 py-1 text-xs font-semibold tracking-[0.22em] text-[color:var(--color-brand)] uppercase">
                  {t('auth.formEyebrow')}
                </div>

                <div className="mt-4">
                  <h2 className="text-2xl font-semibold text-[color:var(--color-ink)]">
                    {t('sign_in')}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted)]">
                    {t('auth.formIntro')}
                  </p>
                  {redirectReasonTitle && redirectReasonDescription ? (
                    <div
                      role="status"
                      aria-live="polite"
                      className={`mt-3 rounded-2xl border px-3 py-3 text-sm shadow-sm ${redirectReasonTone}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5">{redirectReasonIcon}</div>
                        <div className="min-w-0">
                          <p className="font-semibold">{redirectReasonTitle}</p>
                          <p className="mt-1 text-xs leading-5 opacity-90">
                            {redirectReasonDescription}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {destinationLabel ? (
                    <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-[rgba(12,107,88,0.12)] bg-[rgba(12,107,88,0.06)] px-3 py-1.5 text-xs font-medium text-[color:var(--color-brand)]">
                      <Route className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {t('auth.returningTo', { section: destinationLabel })}
                      </span>
                    </div>
                  ) : null}
                </div>

                <form
                  onSubmit={handleSubmit(handleValidSubmit, handleInvalidSubmit)}
                  noValidate
                  aria-busy={buttonDisabled}
                  className="mt-5 space-y-3.5"
                >
                  <fieldset disabled={buttonDisabled} className="space-y-3.5">
                    <div>
                      <label
                        htmlFor="sign-in-email"
                        className="mb-2 block text-sm font-semibold text-[color:var(--color-ink)]"
                      >
                        {t('email')}
                      </label>
                      <div
                        className={`${fieldBaseClasses} ${
                          emailError ? 'border-red-300 bg-red-50/80' : 'border-[color:var(--color-border)]'
                        } ${buttonDisabled ? 'opacity-80' : ''}`}
                      >
                        <Mail className={`h-5 w-5 shrink-0 ${emailError ? 'text-red-500' : 'text-[color:var(--color-muted)]'}`} />
                        <input
                          id="sign-in-email"
                          type="email"
                          autoFocus
                          autoComplete="email"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          inputMode="email"
                          enterKeyHint="next"
                          dir={credentialsDirection}
                          lang="en"
                          placeholder={t('auth.emailPlaceholder')}
                          aria-invalid={Boolean(emailError)}
                          aria-describedby={emailMessageId}
                          {...emailField}
                          onKeyDown={handleEmailKeyDown}
                          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] text-[color:var(--color-ink)] outline-none placeholder:text-[color:var(--color-muted)]/70"
                        />
                      </div>
                      <p
                        id={emailMessageId}
                        role={emailError ? 'alert' : undefined}
                        className={`mt-1.5 text-[11px] ${emailError ? 'text-red-600' : 'text-[color:var(--color-muted)]'}`}
                      >
                        {emailError || t('auth.emailHint')}
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="sign-in-password"
                        className="mb-2 block text-sm font-semibold text-[color:var(--color-ink)]"
                      >
                        {t('password')}
                      </label>
                      <div
                        className={`${fieldBaseClasses} ${
                          passwordError ? 'border-red-300 bg-red-50/80' : 'border-[color:var(--color-border)]'
                        } ${buttonDisabled ? 'opacity-80' : ''}`}
                      >
                        <ShieldCheck
                          className={`h-5 w-5 shrink-0 ${
                            passwordError ? 'text-red-500' : 'text-[color:var(--color-muted)]'
                          }`}
                        />
                        <input
                          id="sign-in-password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          autoCapitalize="none"
                          autoCorrect="off"
                          spellCheck={false}
                          enterKeyHint="go"
                          dir={credentialsDirection}
                          lang="en"
                          placeholder={t('auth.passwordPlaceholder')}
                          aria-invalid={Boolean(passwordError)}
                          aria-describedby={passwordMessageId}
                          {...passwordField}
                          onKeyDown={handlePasswordKeyboardState}
                          onKeyUp={handlePasswordKeyboardState}
                          onBlur={(event) => {
                            passwordField.onBlur(event);
                            setIsCapsLockOn(false);
                          }}
                          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-[15px] text-[color:var(--color-ink)] outline-none placeholder:text-[color:var(--color-muted)]/70"
                        />
                        <button
                          type="button"
                          disabled={buttonDisabled}
                          onClick={() => setShowPassword((current) => !current)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--color-muted)] transition-colors hover:bg-black/5 hover:text-[color:var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
                          aria-controls="sign-in-password"
                          aria-pressed={showPassword}
                          aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <p
                        id={passwordMessageId}
                        role={passwordError || isCapsLockOn ? 'alert' : undefined}
                        className={`mt-1.5 text-[11px] ${
                          passwordError
                            ? 'text-red-600'
                            : isCapsLockOn
                              ? 'text-amber-700'
                              : 'text-[color:var(--color-muted)]'
                        }`}
                      >
                        {passwordError ||
                          (isCapsLockOn
                            ? t('auth.capsLockWarning')
                            : t('auth.passwordHint'))}
                      </p>
                    </div>

                    {formError ? (
                      <div
                        id={formErrorId}
                        role="alert"
                        aria-live="assertive"
                        className="rounded-xl border border-red-200 bg-red-50/90 px-3 py-2.5 text-xs leading-5 text-red-700"
                      >
                        {formError}
                      </div>
                    ) : null}

                    <button
                      type="submit"
                      disabled={buttonDisabled}
                      aria-describedby={formError ? formErrorId : undefined}
                      className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#0c6b58_0%,#0f8a72_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_34px_rgba(12,107,88,0.24)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_42px_rgba(12,107,88,0.28)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                    >
                      {buttonDisabled ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : null}
                      <span>{buttonDisabled ? t('loading') : t('auth.submit')}</span>
                      {!buttonDisabled ? (
                        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 rtl:motion-reduce:group-hover:translate-x-0" />
                      ) : null}
                    </button>
                    <p
                      role="status"
                      aria-live="polite"
                      className="min-h-5 text-center text-[11px] text-[color:var(--color-muted)]"
                    >
                      {buttonDisabled ? t('auth.submitting') : ''}
                    </p>
                  </fieldset>
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
        duration={toast.variant === 'error' ? 7000 : 5000}
        onOpenChange={(open) => setToast((currentToast) => ({ ...currentToast, open }))}
        className={`relative overflow-hidden rounded-2xl border p-4 opacity-0 translate-y-2 shadow-[0_18px_45px_rgba(23,18,14,0.16)] backdrop-blur transition duration-300 data-[state=open]:translate-y-0 data-[state=open]:opacity-100 data-[state=closed]:pointer-events-none data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] motion-reduce:translate-y-0 motion-reduce:transition-none ${toastVariantClasses}`}
      >
        <div
          className={`absolute inset-x-0 top-0 h-1 ${
            toast.variant === 'error' ? 'bg-red-400/80' : 'bg-amber-400/80'
          }`}
        />
        <div className="flex items-start gap-3 pt-1">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${toastIconClasses}`}>
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <Toast.Title className="text-sm font-semibold">{toast.title}</Toast.Title>
            <Toast.Description className="mt-1 text-sm opacity-90">
              {toast.description}
            </Toast.Description>
          </div>
          <Toast.Close asChild>
            <button
              type="button"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-current/65 transition hover:bg-black/5 hover:text-current motion-reduce:transition-none"
              aria-label={t('close_notice')}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </Toast.Close>
        </div>
      </Toast.Root>
      <Toast.Viewport
        className={`fixed top-4 z-50 flex w-96 max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none ${
          locale === 'ar' ? 'left-4' : 'right-4'
        }`}
      />
    </Toast.Provider>
  );
}
