import { NextResponse } from "next/server";
import { dashboardRuntimeConfig } from "@/lib/api/config";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    dashboard: dashboardRuntimeConfig.appName,
    backendBaseUrl: dashboardRuntimeConfig.apiBaseUrl,
    websocketUrl: dashboardRuntimeConfig.wsUrl,
  });
}
