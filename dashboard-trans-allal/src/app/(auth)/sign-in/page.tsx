import { SectionCard } from "@/components/ui/section-card";
import { authCopy } from "@/features/auth/auth-copy";

export default function SignInPage() {
  return (
    <div className="w-full max-w-xl">
      <SectionCard
        eyebrow="Auth Boundary"
        title={authCopy.title}
        description={authCopy.summary}
      >
        <div className="space-y-3 text-sm text-[var(--color-muted)]">
          {authCopy.readiness.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
