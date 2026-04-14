import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  Inbox,
  Info,
  LoaderCircle,
  Search,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../../lib/utils/cn';

interface ManagementPanelProps {
  eyebrow?: string;
  title?: string;
  description?: string;
  className?: string;
  bodyClassName?: string;
  headerSlot?: ReactNode;
  children?: ReactNode;
}

interface ManagementHeroProps {
  eyebrow: string;
  title: string;
  description: string;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  actions?: ReactNode;
  children?: ReactNode;
}

interface ManagementStatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  note: string;
  toneClassName?: string;
}

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  hint?: string;
  className?: string;
}

interface PaginationBarProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

interface ToneBadgeProps {
  label: string;
  toneClassName?: string;
}

interface ManagementStateProps {
  title: string;
  description?: string;
  className?: string;
  icon?: LucideIcon;
  toneClassName?: string;
  compact?: boolean;
}

interface ManagementTableStateProps
  extends Omit<ManagementStateProps, 'className' | 'compact'> {
  colSpan: number;
}

interface ManagementMobileListProps {
  children?: ReactNode;
  className?: string;
}

interface ManagementMobileCardProps {
  title: string;
  subtitle?: string;
  className?: string;
  headerSlot?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  selected?: boolean;
  onClick?: () => void;
}

interface ManagementActionButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: 'brand' | 'danger' | 'neutral' | 'solid' | 'hero';
  size?: 'sm' | 'md';
  loading?: boolean;
}

interface ManagementFieldProps {
  label: string;
  optionalLabel?: string;
  hint?: string;
  className?: string;
  children?: ReactNode;
}

interface ManagementCheckboxFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  description?: string;
  className?: string;
}

interface ManagementInputFieldProps
  extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  icon?: LucideIcon;
}

interface ManagementSelectFieldProps
  extends SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
  children?: ReactNode;
}

interface ManagementTextareaFieldProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}

interface ManagementCalloutProps {
  title?: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  tone?: 'info' | 'danger' | 'warning' | 'success';
  icon?: LucideIcon;
}

interface ManagementDetailTileProps {
  label: string;
  value: string;
  className?: string;
  valueClassName?: string;
}

interface ManagementSegmentedControlProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{
    value: string;
    label: string;
  }>;
  className?: string;
}

interface ManagementFormActionsProps {
  className?: string;
  children?: ReactNode;
}

interface ManagementSurfaceCardProps {
  className?: string;
  children?: ReactNode;
}

interface ManagementIconBadgeProps {
  icon: LucideIcon;
  className?: string;
  size?: number;
}

interface ManagementSkeletonBlockProps {
  className?: string;
}

interface ManagementRowsSkeletonProps {
  count?: number;
  className?: string;
  itemClassName?: string;
  detailColumns?: number;
}

interface ManagementTableSkeletonProps {
  colSpan: number;
  rows?: number;
}

interface ManagementTrendSkeletonProps {
  count?: number;
  className?: string;
}

export const MANAGEMENT_TABLE_HEAD_CLASSNAME =
  'sticky top-0 z-10 border-b border-[rgba(15,23,42,0.08)] bg-[rgba(247,243,235,0.9)] px-4 py-3 text-start text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)] backdrop-blur sm:px-5';

export const MANAGEMENT_TABLE_CELL_CLASSNAME = 'px-4 py-3.5 align-middle sm:px-5';

export const MANAGEMENT_FIELD_CLASSNAME =
  'h-12 rounded-2xl border border-[var(--color-border)] bg-white/84 px-4 text-sm text-[var(--color-ink)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[rgba(12,107,88,0.4)] focus:bg-white focus:shadow-[0_0_0_4px_rgba(12,107,88,0.08)] disabled:cursor-not-allowed disabled:bg-[rgba(255,255,255,0.56)] disabled:text-[var(--color-muted)] disabled:opacity-70 motion-reduce:transition-none';

export const MANAGEMENT_TEXTAREA_CLASSNAME =
  'min-h-28 rounded-2xl border border-[var(--color-border)] bg-white/84 px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[rgba(12,107,88,0.4)] focus:bg-white focus:shadow-[0_0_0_4px_rgba(12,107,88,0.08)] disabled:cursor-not-allowed disabled:bg-[rgba(255,255,255,0.56)] disabled:text-[var(--color-muted)] disabled:opacity-70 motion-reduce:transition-none';

export function ManagementHero({
  eyebrow,
  title,
  description,
  className,
  headerClassName,
  contentClassName,
  actions,
  children,
}: ManagementHeroProps) {
  return (
    <section
      className={cn(
        'rounded-[28px] border border-[rgba(255,255,255,0.16)] p-4 text-white shadow-[var(--shadow-elevated)] md:rounded-[30px] md:p-6',
        className,
      )}
    >
      <div
        className={cn(
          'flex flex-col gap-4 md:gap-5',
          actions ? 'xl:flex-row xl:items-start xl:justify-between' : undefined,
          headerClassName,
        )}
      >
        <div className={cn('max-w-3xl', contentClassName)}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/62">
            {eyebrow}
          </p>
          <h1 className="mt-2.5 text-2xl font-semibold tracking-tight md:mt-3 md:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-7 text-white/78 md:mt-4 md:text-base">
            {description}
          </p>
        </div>
        {actions}
      </div>

      {children ? <div className="mt-6">{children}</div> : null}
    </section>
  );
}

export function ManagementPanel({
  eyebrow,
  title,
  description,
  className,
  bodyClassName,
  headerSlot,
  children,
}: ManagementPanelProps) {
  return (
    <section
      className={cn(
        'rounded-[26px] border border-[var(--color-border)] bg-[linear-gradient(180deg,var(--color-panel-strong)_0%,rgba(255,255,255,0.72)_100%)] shadow-[var(--shadow-panel)] backdrop-blur',
        className,
      )}
    >
      {(eyebrow || title || description || headerSlot) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[rgba(15,23,42,0.08)] px-4 py-3.5 md:px-5 md:py-4">
          <div className="max-w-3xl">
            {eyebrow ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-brand)]">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--color-ink)] md:text-[1.4rem]">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                {description}
              </p>
            ) : null}
          </div>
          {headerSlot}
        </div>
      )}
      <div className={cn('p-4 md:p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

export function ManagementSurfaceCard({
  className,
  children,
}: ManagementSurfaceCardProps) {
  return (
    <div
      className={cn(
        'rounded-[24px] border border-[var(--color-border)] bg-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ManagementIconBadge({
  icon: Icon,
  className,
  size = 20,
}: ManagementIconBadgeProps) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-[rgba(12,107,88,0.08)] p-3 text-[var(--color-brand)]',
        className,
      )}
    >
      <Icon size={size} />
    </div>
  );
}

export function ManagementSkeletonBlock({
  className,
}: ManagementSkeletonBlockProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse rounded-xl bg-[rgba(15,23,42,0.08)]',
        className,
      )}
    />
  );
}

export function ManagementRowsSkeleton({
  count = 3,
  className,
  itemClassName,
  detailColumns = 0,
}: ManagementRowsSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }, (_, index) => (
        <ManagementSurfaceCard key={index} className={cn('p-4', itemClassName)}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2.5">
              <ManagementSkeletonBlock className="h-4 w-40 max-w-full" />
              <ManagementSkeletonBlock className="h-3 w-24" />
            </div>
            <ManagementSkeletonBlock className="h-6 w-20 rounded-full" />
          </div>

          {detailColumns > 0 ? (
            <div
              className={cn(
                'mt-4 grid gap-3',
                detailColumns === 2 && 'sm:grid-cols-2',
              )}
            >
              {Array.from({ length: detailColumns }, (_, detailIndex) => (
                <ManagementSkeletonBlock
                  key={detailIndex}
                  className="h-16 rounded-[18px]"
                />
              ))}
            </div>
          ) : null}
        </ManagementSurfaceCard>
      ))}
    </div>
  );
}

export function ManagementTrendSkeleton({
  count = 4,
  className,
}: ManagementTrendSkeletonProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <ManagementSkeletonBlock className="h-4 w-24" />
            <ManagementSkeletonBlock className="h-4 w-28" />
          </div>
          <ManagementSkeletonBlock className="h-3 rounded-full" />
          <div className="flex flex-wrap gap-3">
            <ManagementSkeletonBlock className="h-3 w-16" />
            <ManagementSkeletonBlock className="h-3 w-20" />
            <ManagementSkeletonBlock className="h-3 w-18" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ManagementStatCard({
  icon: Icon,
  label,
  value,
  note,
  toneClassName,
}: ManagementStatCardProps) {
  return (
    <article className="rounded-[22px] border border-[rgba(255,255,255,0.14)] bg-white/9 p-3.5 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/64">
            {label}
          </p>
          <p className="mt-2.5 text-3xl font-semibold tracking-tight text-white">
            {value}
          </p>
        </div>
        <div
          className={cn(
            'rounded-2xl bg-white/12 p-3 text-white',
            toneClassName,
          )}
        >
          <Icon size={18} />
        </div>
      </div>
      <p className="mt-2.5 text-sm leading-6 text-white/72">{note}</p>
    </article>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
  hint,
  className,
}: SearchFieldProps) {
  return (
    <div className={cn('w-full', className)}>
      <label className="relative block">
        <Search className="pointer-events-none absolute inset-y-0 left-4 my-auto h-4 w-4 text-[var(--color-muted)]" />
        <input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          inputMode="search"
          enterKeyHint="search"
          aria-label={placeholder}
          autoComplete="off"
          spellCheck={false}
          className="h-11 w-full rounded-2xl border border-[var(--color-border)] bg-white/84 pl-11 pr-4 text-sm text-[var(--color-ink)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[rgba(12,107,88,0.4)] focus:bg-white focus:shadow-[0_0_0_4px_rgba(12,107,88,0.08)] motion-reduce:transition-none"
        />
      </label>
      {hint ? (
        <p className="mt-2 text-xs leading-5 text-[var(--color-muted)]">{hint}</p>
      ) : null}
    </div>
  );
}

export function ManagementInputField({
  className,
  icon: Icon,
  type = 'text',
  ...props
}: ManagementInputFieldProps) {
  const ResolvedIcon =
    Icon ??
    (type === 'datetime-local'
      ? CalendarClock
      : type === 'date'
        ? CalendarDays
        : undefined);

  return (
    <div className="relative">
      {ResolvedIcon ? (
        <ResolvedIcon
          aria-hidden="true"
          size={16}
          className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
        />
      ) : null}
      <input
        type={type}
        className={cn(
          MANAGEMENT_FIELD_CLASSNAME,
          'w-full',
          ResolvedIcon ? 'ps-11' : undefined,
          className,
        )}
        {...props}
      />
    </div>
  );
}

export function ManagementSelectField({
  className,
  children,
  ...props
}: ManagementSelectFieldProps) {
  return (
    <div className="relative">
      <select
        className={cn(
          MANAGEMENT_FIELD_CLASSNAME,
          'w-full appearance-none pe-11',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        size={16}
        className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
      />
    </div>
  );
}

export function ManagementTextareaField({
  className,
  ...props
}: ManagementTextareaFieldProps) {
  return (
    <textarea
      className={cn(MANAGEMENT_TEXTAREA_CLASSNAME, 'w-full', className)}
      {...props}
    />
  );
}

export function PaginationBar({
  page,
  totalPages,
  onChange,
}: PaginationBarProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex flex-wrap justify-center gap-2 border-t border-[rgba(15,23,42,0.08)] px-4 py-3 md:px-5">
      {Array.from({ length: totalPages }, (_, index) => {
        const nextPage = index + 1;
        const isActive = nextPage === page;

        return (
          <button
            key={nextPage}
            type="button"
            onClick={() => onChange(nextPage)}
            className={cn(
              'min-w-10 rounded-full border px-3 py-2 text-sm font-medium transition motion-reduce:transition-none',
              isActive
                ? 'border-transparent bg-[var(--color-brand)] text-white shadow-[0_14px_30px_rgba(12,107,88,0.18)]'
                : 'border-[var(--color-border)] bg-white/80 text-[var(--color-ink)] hover:bg-white',
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            {nextPage}
          </button>
        );
      })}
    </div>
  );
}

export function ToneBadge({ label, toneClassName }: ToneBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold',
        toneClassName ??
          'border-[rgba(15,23,42,0.08)] bg-[rgba(15,23,42,0.05)] text-[var(--color-ink)]',
      )}
    >
      {label}
    </span>
  );
}

export function ManagementField({
  label,
  optionalLabel,
  hint,
  className,
  children,
}: ManagementFieldProps) {
  return (
    <div className={cn('grid gap-2 text-sm text-[var(--color-muted)]', className)}>
      <span className="flex flex-wrap items-center gap-2">
        <span>{label}</span>
        {optionalLabel ? (
          <span className="text-xs text-[var(--color-muted)]/80">
            ({optionalLabel})
          </span>
        ) : null}
      </span>
      {children}
      {hint ? (
        <span className="text-xs leading-5 text-[var(--color-muted)]">{hint}</span>
      ) : null}
    </div>
  );
}

export function ManagementCheckboxField({
  label,
  description,
  className,
  ...props
}: ManagementCheckboxFieldProps) {
  return (
    <label
      className={cn(
        'flex items-start gap-3 rounded-[22px] border border-[var(--color-border)] bg-white/72 px-4 py-3 text-sm text-[var(--color-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]',
        className,
      )}
    >
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-brand)] focus:ring-[var(--color-brand)]"
        {...props}
      />
      <span className="min-w-0">
        <span className="block font-medium text-[var(--color-ink)]">{label}</span>
        {description ? (
          <span className="mt-1 block text-xs leading-5 text-[var(--color-muted)]">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}

export function ManagementActionButton({
  tone = 'brand',
  size = 'sm',
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...props
}: ManagementActionButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full border font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none',
        size === 'md' ? 'px-5 py-2.5 text-sm' : 'px-3 py-1.5 text-xs',
        tone === 'brand' &&
          'border-[rgba(12,107,88,0.18)] bg-[rgba(12,107,88,0.08)] text-[var(--color-brand)] hover:bg-[rgba(12,107,88,0.12)]',
        tone === 'danger' &&
          'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
        tone === 'neutral' &&
          'border-[var(--color-border)] bg-white/84 text-[var(--color-ink)] hover:bg-white',
        tone === 'solid' &&
          'border-transparent bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-deep)]',
        tone === 'hero' &&
          'border-transparent bg-white text-[var(--color-brand-deep)] hover:bg-white/92',
        className,
      )}
      {...props}
    >
      {loading ? <LoaderCircle size={size === 'md' ? 16 : 14} className="animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function ManagementCallout({
  title,
  description,
  children,
  className,
  tone = 'info',
  icon,
}: ManagementCalloutProps) {
  const toneClasses =
    tone === 'danger'
      ? {
          wrapper: 'border-red-200 bg-red-50/90 text-red-900',
          icon: 'bg-red-100 text-red-700',
          description: 'text-red-700',
        }
      : tone === 'warning'
        ? {
            wrapper: 'border-amber-200 bg-amber-50/90 text-amber-950',
            icon: 'bg-amber-100 text-amber-700',
            description: 'text-amber-800',
          }
        : tone === 'success'
          ? {
              wrapper: 'border-emerald-200 bg-emerald-50/90 text-emerald-950',
              icon: 'bg-emerald-100 text-emerald-700',
              description: 'text-emerald-800',
            }
          : {
              wrapper:
                'border-[rgba(12,107,88,0.14)] bg-[rgba(12,107,88,0.08)] text-[var(--color-ink)]',
              icon: 'bg-white/80 text-[var(--color-brand)]',
              description: 'text-[var(--color-muted)]',
            };

  const Icon = icon ?? (tone === 'danger' ? AlertTriangle : Info);

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-[22px] border px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]',
        toneClasses.wrapper,
        className,
      )}
    >
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
          toneClasses.icon,
        )}
      >
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        {title ? (
          <p className="text-sm font-semibold text-current">{title}</p>
        ) : null}
        {description ? (
          <p
            className={cn(
              'text-sm leading-6',
              title ? 'mt-1.5' : undefined,
              toneClasses.description,
            )}
          >
            {description}
          </p>
        ) : null}
        {children ? <div className={cn(title || description ? 'mt-2.5' : undefined)}>{children}</div> : null}
      </div>
    </div>
  );
}

export function ManagementDetailTile({
  label,
  value,
  className,
  valueClassName,
}: ManagementDetailTileProps) {
  return (
    <div
      className={cn(
        'rounded-[22px] border border-[var(--color-border)] bg-white/76 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]',
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">
        {label}
      </p>
      <p
        className={cn(
          'mt-2 text-sm font-medium leading-6 text-[var(--color-ink)]',
          valueClassName,
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function ManagementSegmentedControl({
  value,
  onChange,
  options,
  className,
}: ManagementSegmentedControlProps) {
  return (
    <div
      className={cn(
        'flex rounded-2xl bg-[rgba(15,23,42,0.06)] p-1',
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'flex-1 rounded-xl px-3 py-2 text-sm font-medium transition motion-reduce:transition-none',
            value === option.value
              ? 'bg-[var(--color-brand)] text-white shadow-sm'
              : 'text-[var(--color-muted)] hover:bg-white',
          )}
          aria-pressed={value === option.value}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function ManagementFormActions({
  className,
  children,
}: ManagementFormActionsProps) {
  return (
    <div className={cn('flex flex-wrap items-center justify-end gap-3', className)}>
      {children}
    </div>
  );
}

function ManagementStateCard({
  title,
  description,
  className,
  icon: Icon = Inbox,
  toneClassName,
  compact = false,
}: ManagementStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-[24px] border border-dashed border-[var(--color-border)] bg-white/56 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]',
        compact ? 'px-4 py-7' : 'px-5 py-10',
        className,
      )}
    >
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(12,107,88,0.08)] text-[var(--color-brand)]',
          toneClassName,
        )}
      >
        <Icon
          size={compact ? 18 : 20}
          className={Icon === LoaderCircle ? 'animate-spin' : undefined}
        />
      </div>
      <p className={cn('mt-4 font-semibold text-[var(--color-ink)]', compact ? 'text-sm' : 'text-base')}>
        {title}
      </p>
      {description ? (
        <p
          className={cn(
            'mt-2 max-w-xl text-[var(--color-muted)]',
            compact ? 'text-xs leading-5' : 'text-sm leading-6',
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function ManagementPageState(props: ManagementStateProps) {
  return (
    <div className="flex min-h-[320px] items-center justify-center">
      <ManagementStateCard className="w-full max-w-2xl" {...props} />
    </div>
  );
}

export function ManagementInlineState(props: ManagementStateProps) {
  return <ManagementStateCard compact {...props} />;
}

export function ManagementTableState({
  colSpan,
  title,
  description,
  icon,
  toneClassName,
}: ManagementTableStateProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-6 sm:px-5">
        <ManagementInlineState
          title={title}
          description={description}
          icon={icon}
          toneClassName={toneClassName}
        />
      </td>
    </tr>
  );
}

export function ManagementTableSkeleton({
  colSpan,
  rows = 4,
}: ManagementTableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, index) => (
        <tr key={index}>
          <td colSpan={colSpan} className="px-4 py-3 sm:px-5">
            <div className="flex items-center justify-between gap-4 rounded-[22px] border border-[var(--color-border)] bg-white/64 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]">
              <div className="min-w-0 flex-1 space-y-2.5">
                <ManagementSkeletonBlock className="h-4 w-44 max-w-full" />
                <ManagementSkeletonBlock className="h-3 w-28" />
              </div>
              <div className="hidden items-center gap-3 md:flex">
                <ManagementSkeletonBlock className="h-6 w-20 rounded-full" />
                <ManagementSkeletonBlock className="h-6 w-20 rounded-full" />
              </div>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

export function ManagementMobileList({
  children,
  className,
}: ManagementMobileListProps) {
  return <div className={cn('grid gap-3 p-4 md:hidden', className)}>{children}</div>;
}

export function ManagementDesktopTable({
  children,
  className,
}: ManagementMobileListProps) {
  return (
    <div
      className={cn(
        'hidden overflow-x-auto md:block',
        '[scrollbar-width:thin] [scrollbar-color:rgba(98,88,77,0.32)_transparent]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ManagementMobileCard({
  title,
  subtitle,
  className,
  headerSlot,
  footer,
  children,
  selected = false,
  onClick,
}: ManagementMobileCardProps) {
  const cardClassName = cn(
    'w-full rounded-[24px] border bg-white/76 p-4 text-start shadow-[var(--shadow-panel)] transition motion-reduce:transition-none',
    selected
      ? 'border-[rgba(12,107,88,0.26)] bg-[rgba(12,107,88,0.08)]'
      : 'border-[var(--color-border)]',
    onClick && 'cursor-pointer hover:bg-white active:scale-[0.995] motion-reduce:transform-none',
    className,
  );

  return (
    <article
      className={cardClassName}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick) {
          return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-pressed={onClick ? selected : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
            {title}
          </p>
          {subtitle ? (
            <p className="mt-1 text-xs leading-5 text-[var(--color-muted)]">
              {subtitle}
            </p>
          ) : null}
        </div>
        {headerSlot}
      </div>
      {children ? <div className="mt-3 space-y-3">{children}</div> : null}
      {footer ? <div className="mt-3 flex flex-wrap gap-2">{footer}</div> : null}
    </article>
  );
}
