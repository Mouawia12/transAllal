export const authCopy = {
  title: "Authentication shell is prepared",
  summary:
    "This route is reserved for future admin/operator authentication. Token storage, backend base URL handling, and auth folders are already organized for the next implementation phase.",
  readiness: [
    "Token storage is centralized and safe to replace with a real session flow later.",
    "API configuration is shared across server and client code paths.",
    "No production auth logic is implemented in this phase by design.",
  ],
};
