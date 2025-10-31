"use client";

import { useCallback, useEffect, useState } from "react";

import type { FlashlightColor } from "@/app/components/theme/ThemeProvider";

type TimeseriesPoint = {
  date: string;
  responses: number;
};

type TopForm = {
  id: string;
  title: string;
  responses: number;
  fields: number;
};

type RecentResponse = {
  id: string;
  formId: string;
  formTitle: string;
  submittedAt: string;
  completionMs: number | null;
  highlight: string | null;
};

type DashboardOverview = {
  ownerId: string;
  totals: {
    forms: number;
    responses: number;
    avgCompletionMs: number | null;
    responseVelocity: number;
  };
  timeseries: TimeseriesPoint[];
  topForms: TopForm[];
  flashlights: FlashlightColor[];
  recentResponses: RecentResponse[];
};

type HookState = {
  data: DashboardOverview | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

export function useDashboardOverview(): HookState {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/dashboard/overview", {
        method: "GET",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401) {
        setData(null);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const json = (await response.json()) as { overview: DashboardOverview };
      setData(json.overview ?? null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  return {
    data,
    loading,
    error,
    refresh: fetchOverview,
  };
}

export type { DashboardOverview, TimeseriesPoint, TopForm, RecentResponse };
