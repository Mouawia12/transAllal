import { FeatureWorkspace } from "@/components/shared/feature-workspace";
import { companiesFeature } from "@/features/companies/companies.config";

export default function CompaniesPage() {
  return <FeatureWorkspace feature={companiesFeature} />;
}
