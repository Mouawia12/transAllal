export interface FeatureDescriptor {
  title: string;
  summary: string;
  readiness: string[];
  apiPaths: string[];
  realtime?: boolean;
}
