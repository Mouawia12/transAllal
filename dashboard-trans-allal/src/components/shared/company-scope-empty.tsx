'use client';

import { Building2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ManagementPageState } from './management-ui';

export function CompanyScopeEmpty() {
  const t = useTranslations();

  return (
    <ManagementPageState
      icon={Building2}
      title={t('company_scope.empty_title')}
      description={t('company_scope.empty_description')}
    />
  );
}
