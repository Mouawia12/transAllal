export const dashboardNavigation = [
  { href: "/", label: "Overview", description: "Landing surface for operations and KPIs" },
  { href: "/companies", label: "Companies", description: "Tenant and client workspace" },
  { href: "/drivers", label: "Drivers", description: "Driver accounts and assignments" },
  { href: "/trucks", label: "Trucks", description: "Fleet inventory and status" },
  { href: "/trips", label: "Trips", description: "Trip lifecycle and dispatch flows" },
  { href: "/tracking", label: "Tracking", description: "Live location and telemetry" },
  { href: "/alerts", label: "Alerts", description: "Realtime incidents and warnings" },
  { href: "/reports", label: "Reports", description: "Analytics and export views" },
  { href: "/settings", label: "Settings", description: "Preferences and integrations" },
] as const;
