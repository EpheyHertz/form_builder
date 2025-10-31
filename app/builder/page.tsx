"use client";

import { FormBuilder } from "@/app/components/FormBuilder";
import { useTheme } from "@/app/components/theme/ThemeProvider";

export default function BuilderPage() {
  const { palette } = useTheme();

  return (
    <div
      className="rounded-3xl border p-6 transition-colors duration-300"
      style={{
        background: palette.surfaces.panel,
        borderColor: palette.border.subtle,
        boxShadow: palette.shadows.xl,
      }}
    >
      <FormBuilder />
    </div>
  );
}
