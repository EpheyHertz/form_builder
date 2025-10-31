"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import type { CSSProperties, FormEvent } from "react";

type FieldType =
  | "short_text"
  | "long_text"
  | "email"
  | "number"
  | "dropdown"
  | "checkbox"
  | "date";

type ThemeMode = "light" | "dark";
type BuilderMode = "edit" | "preview";

type ThemeTag =
  | "formTitle"
  | "sectionTitle"
  | "label"
  | "helper"
  | "input"
  | "button";

interface ThemeToken {
  color: string;
  fontSize: string;
  fontFamily: string;
  fontWeight: number;
  background?: string;
  borderColor?: string;
}

interface ThemeSnapshot {
  background: string;
  panel: string;
  card: string;
  border: string;
  text: string;
  muted: string;
  tokens: Record<ThemeTag, ThemeToken>;
}

interface ThemeState {
  mode: ThemeMode;
  palette: Record<ThemeMode, ThemeSnapshot>;
}

type FieldOption = {
  id: string;
  label: string;
  value: string;
};

type FormField = {
  id: string;
  type: FieldType;
  label: string;
  description?: string;
  placeholder?: string;
  required: boolean;
  options?: FieldOption[];
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number;
};

type FormMeta = {
  title: string;
  description: string;
  submitLabel: string;
};

type BuilderState = {
  fields: FormField[];
  selectedFieldId: string | null;
  formMeta: FormMeta;
  mode: BuilderMode;
  theme: ThemeState;
};

type BuilderAction =
  | { type: "ADD_FIELD"; payload: FormField }
  | { type: "REMOVE_FIELD"; payload: { id: string } }
  | { type: "DUPLICATE_FIELD"; payload: { id: string } }
  | { type: "SELECT_FIELD"; payload: { id: string | null } }
  | { type: "UPDATE_FIELD"; payload: { id: string; changes: Partial<FormField> } }
  | { type: "REORDER_FIELD"; payload: { id: string; direction: "up" | "down" } }
  | { type: "UPDATE_FORM_META"; payload: Partial<FormMeta> }
  | { type: "SET_MODE"; payload: BuilderMode }
  | { type: "SET_THEME_MODE"; payload: ThemeMode }
  | {
      type: "UPDATE_THEME_TOKEN";
      payload: {
        tag: ThemeTag;
        key: keyof ThemeToken;
        value: string | number;
      };
    }
  | {
      type: "UPDATE_THEME_SURFACE";
      payload: {
        key: keyof Omit<ThemeSnapshot, "tokens">;
        value: string;
      };
    };

type FieldTemplate = {
  type: FieldType;
  title: string;
  description: string;
  icon: string;
  create: () => FormField;
};

const fontOptions = [
  {
    label: "System Sans",
    value: "system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
  },
  {
    label: "Clean Sans",
    value: "\"Segoe UI\", Roboto, Helvetica, Arial, sans-serif",
  },
  {
    label: "Serif",
    value: "Georgia, \"Times New Roman\", serif",
  },
  {
    label: "Mono",
    value: "\"SFMono-Regular\", Consolas, \"Liberation Mono\", monospace",
  },
];

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);

const defaultThemePalette: Record<ThemeMode, ThemeSnapshot> = {
  light: {
    background: "#f1f5f9",
    panel: "#ffffff",
    card: "#ffffff",
    border: "#e2e8f0",
    text: "#0f172a",
    muted: "#64748b",
    tokens: {
      formTitle: {
        color: "#0f172a",
        fontSize: "1.875rem",
        fontFamily: fontOptions[0].value,
        fontWeight: 600,
      },
      sectionTitle: {
        color: "#0f172a",
        fontSize: "1.25rem",
        fontFamily: fontOptions[0].value,
        fontWeight: 600,
      },
      label: {
        color: "#0f172a",
        fontSize: "0.95rem",
        fontFamily: fontOptions[0].value,
        fontWeight: 500,
      },
      helper: {
        color: "#64748b",
        fontSize: "0.85rem",
        fontFamily: fontOptions[0].value,
        fontWeight: 400,
      },
      input: {
        color: "#0f172a",
        fontSize: "1rem",
        fontFamily: fontOptions[0].value,
        fontWeight: 500,
        background: "#ffffff",
        borderColor: "#cbd5f5",
      },
      button: {
        color: "#ffffff",
        fontSize: "1rem",
        fontFamily: fontOptions[0].value,
        fontWeight: 600,
        background: "#2563eb",
        borderColor: "#2563eb",
      },
    },
  },
  dark: {
    background: "#0f172a",
    panel: "#111827",
    card: "#111827",
    border: "#1f2937",
    text: "#f8fafc",
    muted: "#94a3b8",
    tokens: {
      formTitle: {
        color: "#f8fafc",
        fontSize: "1.875rem",
        fontFamily: fontOptions[0].value,
        fontWeight: 600,
      },
      sectionTitle: {
        color: "#f1f5f9",
        fontSize: "1.25rem",
        fontFamily: fontOptions[0].value,
        fontWeight: 600,
      },
      label: {
        color: "#e2e8f0",
        fontSize: "0.95rem",
        fontFamily: fontOptions[0].value,
        fontWeight: 500,
      },
      helper: {
        color: "#94a3b8",
        fontSize: "0.85rem",
        fontFamily: fontOptions[0].value,
        fontWeight: 400,
      },
      input: {
        color: "#f8fafc",
        fontSize: "1rem",
        fontFamily: fontOptions[0].value,
        fontWeight: 500,
        background: "#1f2937",
        borderColor: "#334155",
      },
      button: {
        color: "#0f172a",
        fontSize: "1rem",
        fontFamily: fontOptions[0].value,
        fontWeight: 600,
        background: "#38bdf8",
        borderColor: "#38bdf8",
      },
    },
  },
};

const initialState: BuilderState = {
  fields: [
    {
  id: createId(),
      type: "short_text",
      label: "Full name",
      description: "We use this to personalise your experience.",
      placeholder: "Jane Doe",
      required: true,
      minLength: 2,
    },
    {
  id: createId(),
      type: "email",
      label: "Work email",
      placeholder: "name@company.com",
      description: "We will never share your email.",
      required: true,
    },
    {
  id: createId(),
      type: "dropdown",
      label: "Project type",
      description: "Select the service you are interested in.",
      required: true,
      options: [
  { id: createId(), label: "Website redesign", value: "website" },
  { id: createId(), label: "Mobile app", value: "mobile" },
  { id: createId(), label: "Design system", value: "design-system" },
      ],
    },
  ],
  selectedFieldId: null,
  formMeta: {
    title: "Project inquiry",
    description:
      "Tell us about your project. We will get back to you within two working days.",
    submitLabel: "Send request",
  },
  mode: "edit",
  theme: {
    mode: "light",
    palette: defaultThemePalette,
  },
};

const fieldTemplates: FieldTemplate[] = [
  {
    type: "short_text",
    title: "Short text",
    description: "Single line answer",
    icon: "✏️",
    create: () => ({
  id: createId(),
      type: "short_text",
      label: "Short text",
      placeholder: "Enter text",
      required: false,
    }),
  },
  {
    type: "long_text",
    title: "Long text",
    description: "Paragraph answer",
    icon: "📝",
    create: () => ({
  id: createId(),
      type: "long_text",
      label: "Long text",
      placeholder: "Write your response",
      required: false,
    }),
  },
  {
    type: "email",
    title: "Email",
    description: "Collect validated email",
    icon: "📧",
    create: () => ({
  id: createId(),
      type: "email",
      label: "Email",
      placeholder: "email@example.com",
      required: true,
    }),
  },
  {
    type: "number",
    title: "Number",
    description: "Accept numeric values",
    icon: "#️⃣",
    create: () => ({
  id: createId(),
      type: "number",
      label: "Number",
      placeholder: "0",
      required: false,
      step: 1,
    }),
  },
  {
    type: "dropdown",
    title: "Dropdown",
    description: "Single choice select",
    icon: "⬇️",
    create: () => ({
  id: createId(),
      type: "dropdown",
      label: "Dropdown",
      required: false,
      options: [
  { id: createId(), label: "Option A", value: "option-a" },
  { id: createId(), label: "Option B", value: "option-b" },
      ],
    }),
  },
  {
    type: "checkbox",
    title: "Checkboxes",
    description: "Multiple choice",
    icon: "✅",
    create: () => ({
  id: createId(),
      type: "checkbox",
      label: "Checkboxes",
      required: false,
      options: [
  { id: createId(), label: "Option 1", value: "option-1" },
  { id: createId(), label: "Option 2", value: "option-2" },
      ],
    }),
  },
  {
    type: "date",
    title: "Date",
    description: "Collect a date",
    icon: "📅",
    create: () => ({
  id: createId(),
      type: "date",
      label: "Date",
      required: false,
    }),
  },
];

function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case "ADD_FIELD": {
      return {
        ...state,
        fields: [...state.fields, action.payload],
        selectedFieldId: action.payload.id,
      };
    }
    case "REMOVE_FIELD": {
      const fields = state.fields.filter((field) => field.id !== action.payload.id);
      const selectedFieldId =
        state.selectedFieldId === action.payload.id ? null : state.selectedFieldId;
      return { ...state, fields, selectedFieldId };
    }
    case "DUPLICATE_FIELD": {
      const field = state.fields.find((item) => item.id === action.payload.id);
      if (!field) return state;
      const clone: FormField = {
        ...field,
  id: createId(),
        label: `${field.label} (copy)`
          .replace(/\(copy\) \(copy\)$/i, "(copy)")
          .trim(),
        options: field.options?.map((option) => ({
          ...option,
          id: createId(),
        })),
      };
      const index = state.fields.findIndex((item) => item.id === field.id);
      const nextFields = [...state.fields];
      nextFields.splice(index + 1, 0, clone);
      return { ...state, fields: nextFields, selectedFieldId: clone.id };
    }
    case "SELECT_FIELD": {
      return { ...state, selectedFieldId: action.payload.id };
    }
    case "UPDATE_FIELD": {
      const nextFields = state.fields.map((field) =>
        field.id === action.payload.id ? { ...field, ...action.payload.changes } : field
      );
      return { ...state, fields: nextFields };
    }
    case "REORDER_FIELD": {
      const index = state.fields.findIndex((field) => field.id === action.payload.id);
      if (index === -1) return state;
      const targetIndex = action.payload.direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= state.fields.length) {
        return state;
      }
      const nextFields = [...state.fields];
      const [removed] = nextFields.splice(index, 1);
      nextFields.splice(targetIndex, 0, removed);
      return { ...state, fields: nextFields };
    }
    case "UPDATE_FORM_META": {
      return { ...state, formMeta: { ...state.formMeta, ...action.payload } };
    }
    case "SET_MODE": {
      return { ...state, mode: action.payload };
    }
    case "SET_THEME_MODE": {
      return {
        ...state,
        theme: { ...state.theme, mode: action.payload },
      };
    }
    case "UPDATE_THEME_TOKEN": {
      const { tag, key, value } = action.payload;
      const current = state.theme.palette[state.theme.mode];
      return {
        ...state,
        theme: {
          ...state.theme,
          palette: {
            ...state.theme.palette,
            [state.theme.mode]: {
              ...current,
              tokens: {
                ...current.tokens,
                [tag]: {
                  ...current.tokens[tag],
                  [key]: value,
                },
              },
            },
          },
        },
      };
    }
    case "UPDATE_THEME_SURFACE": {
      const { key, value } = action.payload;
      const current = state.theme.palette[state.theme.mode];
      return {
        ...state,
        theme: {
          ...state.theme,
          palette: {
            ...state.theme.palette,
            [state.theme.mode]: {
              ...current,
              [key]: value,
            },
          },
        },
      };
    }
    default:
      return state;
  }
}

interface FormBuilderProps {
  className?: string;
}

export function FormBuilder({ className }: FormBuilderProps) {
  const [state, dispatch] = useReducer(builderReducer, initialState);
  const activeTheme = state.theme.palette[state.theme.mode];

  useEffect(() => {
    document.documentElement.classList.toggle("dark", state.theme.mode === "dark");
  }, [state.theme.mode]);

  const selectedField = useMemo(
    () => state.fields.find((field) => field.id === state.selectedFieldId) ?? null,
    [state.fields, state.selectedFieldId]
  );

  const handleAddField = (template: FieldTemplate) => {
    const field = template.create();
    dispatch({ type: "ADD_FIELD", payload: field });
  };

  const router = useRouter();
  const [publishing, setPublishing] = useState(false);

  const publishForm = async () => {
    if (publishing) return;
    // basic client-side validation
    if (!state.formMeta.title || state.formMeta.title.trim().length < 3) {
      alert("Please provide a title of at least 3 characters before publishing.");
      return;
    }
    if (!state.fields || state.fields.length === 0) {
      alert("Add at least one field before publishing the form.");
      return;
    }

    setPublishing(true);
    try {
      const payload = {
        title: state.formMeta.title,
        description: state.formMeta.description,
        fields: state.fields.map((f) => ({
          id: f.id,
          label: f.label,
          type: f.type,
          required: Boolean(f.required),
          options: f.options ?? undefined,
        })),
      };

      const res = await fetch("/api/forms", {
        method: "POST",
        // same-origin is sufficient for same-site requests and avoids cross-site cookie issues
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Publish failed:", text);
        alert("Failed to publish form: " + text);
        return;
      }

      // navigate to owner studio where created form will appear
      router.push("/owner");
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("An unexpected error occurred when publishing the form.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div
      className={`min-h-screen w-full pb-16 ${className ?? ""}`.trim()}
      style={{ backgroundColor: activeTheme.background, color: activeTheme.text }}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pt-8 lg:flex-row lg:gap-8 lg:px-8">
        <aside className="flex w-full flex-col gap-4 lg:w-80">
          <ModeCard
            mode={state.mode}
            onModeChange={(mode) => dispatch({ type: "SET_MODE", payload: mode })}
            themeMode={state.theme.mode}
            onThemeModeChange={(mode) =>
              dispatch({ type: "SET_THEME_MODE", payload: mode })
            }
            theme={activeTheme}
          />
          
            <FormMetaPanel
            formMeta={state.formMeta}
            onChange={(changes) =>
              dispatch({ type: "UPDATE_FORM_META", payload: changes })
            }
              theme={activeTheme}
              onPublish={publishForm}
              publishing={publishing}
          />

          <FieldPalette onAdd={handleAddField} theme={activeTheme} />

          <FieldSettingsPanel
            field={selectedField}
            onUpdate={(changes) =>
              selectedField &&
              dispatch({
                type: "UPDATE_FIELD",
                payload: { id: selectedField.id, changes },
              })
            }
            onDelete={() =>
              selectedField &&
              dispatch({ type: "REMOVE_FIELD", payload: { id: selectedField.id } })
            }
            onDuplicate={() =>
              selectedField &&
              dispatch({ type: "DUPLICATE_FIELD", payload: { id: selectedField.id } })
            }
            theme={activeTheme}
          />

          <ThemePanel
            theme={activeTheme}
            mode={state.theme.mode}
            onUpdateSurface={(key, value) =>
              dispatch({
                type: "UPDATE_THEME_SURFACE",
                payload: { key, value },
              })
            }
            onUpdateToken={(tag, key, value) =>
              dispatch({
                type: "UPDATE_THEME_TOKEN",
                payload: { tag, key, value },
              })
            }
          />
        </aside>

        <main className="flex-1">
          <FormCanvas
            fields={state.fields}
            selectedFieldId={state.selectedFieldId}
            mode={state.mode}
            formMeta={state.formMeta}
            theme={activeTheme}
            onSelectField={(id) =>
              dispatch({ type: "SELECT_FIELD", payload: { id } })
            }
            onReorder={(id, direction) =>
              dispatch({
                type: "REORDER_FIELD",
                payload: { id, direction },
              })
            }
            onDuplicate={(id) =>
              dispatch({ type: "DUPLICATE_FIELD", payload: { id } })
            }
            onDelete={(id) =>
              dispatch({ type: "REMOVE_FIELD", payload: { id } })
            }
          />
        </main>
      </div>
    </div>
  );
}

function ModeCard({
  mode,
  onModeChange,
  themeMode,
  onThemeModeChange,
  theme,
}: {
  mode: BuilderMode;
  onModeChange: (mode: BuilderMode) => void;
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
  theme: ThemeSnapshot;
}) {
  return (
    <section
      className="rounded-2xl border px-5 py-5 shadow-sm"
      style={{ backgroundColor: theme.panel, borderColor: theme.border }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium" style={{ color: theme.text }}>
            Modes
          </p>
          <p className="text-xs" style={{ color: theme.muted }}>
            Switch between builder and live form preview.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onThemeModeChange(themeMode === "light" ? "dark" : "light")}
          className="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
          style={{
            color: themeMode === "light" ? theme.text : theme.background,
            backgroundColor: themeMode === "light" ? theme.background : theme.text,
            borderColor: theme.border,
          }}
        >
          {themeMode === "light" ? "🌙 Dark" : "☀️ Light"}
        </button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {["edit", "preview"].map((item) => {
          const isActive = mode === item;
          return (
            <button
              key={item}
              type="button"
              onClick={() => onModeChange(item as BuilderMode)}
              className="rounded-xl border px-3 py-2 text-sm font-medium transition-colors"
              style={{
                borderColor: isActive ? theme.tokens.button.background : theme.border,
                color: isActive ? theme.tokens.button.color : theme.text,
                backgroundColor: isActive ? theme.tokens.button.background : theme.card,
              }}
            >
              {item === "edit" ? "Edit mode" : "Preview"}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function FormMetaPanel({
  formMeta,
  onChange,
  theme,
  onPublish,
  publishing,
}: {
  formMeta: FormMeta;
  onChange: (changes: Partial<FormMeta>) => void;
  theme: ThemeSnapshot;
  onPublish?: () => void;
  publishing?: boolean;
}) {
  return (
    <section
      className="rounded-2xl border px-5 py-5 shadow-sm"
      style={{ backgroundColor: theme.panel, borderColor: theme.border }}
    >
      <h2 className="text-sm font-semibold" style={{ color: theme.text }}>
        Form details
      </h2>
      <div className="mt-4 space-y-4">
        <label className="block text-xs font-medium uppercase tracking-wide"
          style={{ color: theme.muted }}
        >
          Title
          <input
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0"
            style={{
              color: theme.text,
              backgroundColor: theme.card,
              borderColor: theme.border,
            }}
            value={formMeta.title}
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder="Untitled form"
          />
        </label>
        <label className="block text-xs font-medium uppercase tracking-wide"
          style={{ color: theme.muted }}
        >
          Description
          <textarea
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0"
            style={{
              color: theme.text,
              backgroundColor: theme.card,
              borderColor: theme.border,
            }}
            rows={3}
            value={formMeta.description}
            onChange={(event) => onChange({ description: event.target.value })}
            placeholder="Explain what this form collects"
          />
        </label>
        <label className="block text-xs font-medium uppercase tracking-wide"
          style={{ color: theme.muted }}
        >
          Submit button text
          <input
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0"
            style={{
              color: theme.text,
              backgroundColor: theme.card,
              borderColor: theme.border,
            }}
            value={formMeta.submitLabel}
            onChange={(event) => onChange({ submitLabel: event.target.value })}
            placeholder="Submit"
          />
        </label>
      </div>
      <div className="mt-4 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onPublish}
          disabled={Boolean(publishing)}
          className="rounded-md px-3 py-2 text-sm font-medium disabled:opacity-60"
          style={{
            backgroundColor: theme.tokens.button.background,
            color: theme.tokens.button.color,
            borderColor: theme.tokens.button.borderColor ?? theme.border,
          }}
        >
          {publishing ? "Publishing…" : "Publish"}
        </button>
      </div>
    </section>
  );
}

function FieldPalette({
  onAdd,
  theme,
}: {
  onAdd: (template: FieldTemplate) => void;
  theme: ThemeSnapshot;
}) {
  return (
    <section
      className="rounded-2xl border px-5 py-5 shadow-sm"
      style={{ backgroundColor: theme.panel, borderColor: theme.border }}
    >
      <h2 className="text-sm font-semibold" style={{ color: theme.text }}>
        Add fields
      </h2>
      <p className="mt-1 text-xs" style={{ color: theme.muted }}>
        Drag inspired quick-adds. Tap to insert.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {fieldTemplates.map((template) => (
          <button
            key={template.type}
            type="button"
            onClick={() => onAdd(template)}
            className="flex h-full flex-col rounded-xl border px-3 py-3 text-left transition-colors hover:border-transparent hover:shadow"
            style={{
              borderColor: theme.border,
              backgroundColor: theme.card,
              color: theme.text,
            }}
          >
            <span className="text-lg">{template.icon}</span>
            <span className="mt-2 text-sm font-semibold">{template.title}</span>
            <span className="text-xs" style={{ color: theme.muted }}>
              {template.description}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function FieldSettingsPanel({
  field,
  onUpdate,
  onDelete,
  onDuplicate,
  theme,
}: {
  field: FormField | null;
  onUpdate: (changes: Partial<FormField>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  theme: ThemeSnapshot;
}) {
  if (!field) {
    return (
      <section
        className="rounded-2xl border px-5 py-5 shadow-sm"
        style={{ backgroundColor: theme.panel, borderColor: theme.border }}
      >
        <h2 className="text-sm font-semibold" style={{ color: theme.text }}>
          Field settings
        </h2>
        <p className="mt-1 text-xs" style={{ color: theme.muted }}>
          Select a field to customise label, validation and options.
        </p>
      </section>
    );
  }

  const isOptionField = field.type === "dropdown" || field.type === "checkbox";
  const isTextField = field.type === "short_text" || field.type === "long_text";
  const isNumberField = field.type === "number";

  return (
    <section
      className="rounded-2xl border px-5 py-5 shadow-sm"
      style={{ backgroundColor: theme.panel, borderColor: theme.border }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold" style={{ color: theme.text }}>
          {field.label || "Field settings"}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDuplicate}
            className="rounded-full border px-2 py-1 text-xs transition hover:bg-black/5"
            style={{ borderColor: theme.border, color: theme.text }}
          >
            Duplicate
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-full border px-2 py-1 text-xs text-red-500 transition hover:bg-red-500/10"
            style={{ borderColor: theme.border }}
          >
            Delete
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <label className="block text-xs font-medium uppercase tracking-wide"
          style={{ color: theme.muted }}
        >
          Label
          <input
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0"
            style={{
              color: theme.text,
              backgroundColor: theme.card,
              borderColor: theme.border,
            }}
            value={field.label}
            onChange={(event) => onUpdate({ label: event.target.value })}
            placeholder="Untitled question"
          />
        </label>

        <label className="block text-xs font-medium uppercase tracking-wide"
          style={{ color: theme.muted }}
        >
          Description
          <textarea
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0"
            style={{
              color: theme.text,
              backgroundColor: theme.card,
              borderColor: theme.border,
            }}
            rows={3}
            value={field.description ?? ""}
            onChange={(event) => onUpdate({ description: event.target.value })}
            placeholder="Optional helper text"
          />
        </label>

        {field.type !== "checkbox" && (
          <label className="block text-xs font-medium uppercase tracking-wide"
            style={{ color: theme.muted }}
          >
            Placeholder
            <input
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0"
              style={{
                color: theme.text,
                backgroundColor: theme.card,
                borderColor: theme.border,
              }}
              value={field.placeholder ?? ""}
              onChange={(event) => onUpdate({ placeholder: event.target.value })}
              placeholder="Placeholder"
            />
          </label>
        )}

        <label className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
          style={{
            color: theme.text,
            backgroundColor: theme.card,
            borderColor: theme.border,
          }}
        >
          <span>Required</span>
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={field.required}
            onChange={(event) => onUpdate({ required: event.target.checked })}
          />
        </label>

        {isTextField && (
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-medium uppercase tracking-wide"
              style={{ color: theme.muted }}
            >
              Min length
              <input
                type="number"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0"
                style={{
                  color: theme.text,
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                }}
                value={field.minLength ?? ""}
                onChange={(event) =>
                  onUpdate({
                    minLength:
                      event.target.value === ""
                        ? undefined
                        : Number(event.target.value),
                  })
                }
                placeholder="0"
                min={0}
              />
            </label>
            <label className="text-xs font-medium uppercase tracking-wide"
              style={{ color: theme.muted }}
            >
              Max length
              <input
                type="number"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0"
                style={{
                  color: theme.text,
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                }}
                value={field.maxLength ?? ""}
                onChange={(event) =>
                  onUpdate({
                    maxLength:
                      event.target.value === ""
                        ? undefined
                        : Number(event.target.value),
                  })
                }
                placeholder="120"
                min={field.minLength ?? 0}
              />
            </label>
          </div>
        )}

        {isNumberField && (
          <div className="grid grid-cols-3 gap-3">
            <label className="text-xs font-medium uppercase tracking-wide"
              style={{ color: theme.muted }}
            >
              Min
              <input
                type="number"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0"
                style={{
                  color: theme.text,
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                }}
                value={field.min ?? ""}
                onChange={(event) =>
                  onUpdate({
                    min:
                      event.target.value === ""
                        ? undefined
                        : Number(event.target.value),
                  })
                }
              />
            </label>
            <label className="text-xs font-medium uppercase tracking-wide"
              style={{ color: theme.muted }}
            >
              Max
              <input
                type="number"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0"
                style={{
                  color: theme.text,
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                }}
                value={field.max ?? ""}
                onChange={(event) =>
                  onUpdate({
                    max:
                      event.target.value === ""
                        ? undefined
                        : Number(event.target.value),
                  })
                }
              />
            </label>
            <label className="text-xs font-medium uppercase tracking-wide"
              style={{ color: theme.muted }}
            >
              Step
              <input
                type="number"
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0"
                style={{
                  color: theme.text,
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                }}
                value={field.step ?? ""}
                onChange={(event) =>
                  onUpdate({
                    step:
                      event.target.value === ""
                        ? undefined
                        : Number(event.target.value),
                  })
                }
                min={0}
              />
            </label>
          </div>
        )}

        {isOptionField && (
          <OptionEditor
            field={field}
            onUpdate={onUpdate}
            theme={theme}
          />
        )}
      </div>
    </section>
  );
}

function OptionEditor({
  field,
  onUpdate,
  theme,
}: {
  field: FormField;
  onUpdate: (changes: Partial<FormField>) => void;
  theme: ThemeSnapshot;
}) {
  const options = field.options ?? [];

  const handleOptionChange = (optionId: string, value: string) => {
    onUpdate({
      options: options.map((option) =>
        option.id === optionId ? { ...option, label: value, value } : option
      ),
    });
  };

  const handleRemove = (optionId: string) => {
    onUpdate({ options: options.filter((option) => option.id !== optionId) });
  };

  const handleAdd = () => {
    const index = options.length + 1;
    onUpdate({
      options: [
        ...options,
        {
          id: createId(),
          label: `Option ${index}`,
          value: `option-${index}`,
        },
      ],
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide"
          style={{ color: theme.muted }}
        >
          Options
        </p>
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-full border px-2 py-1 text-xs transition hover:bg-black/5"
          style={{ borderColor: theme.border, color: theme.text }}
        >
          Add option
        </button>
      </div>
      <div className="space-y-2">
        {options.map((option) => (
          <div
            key={option.id}
            className="flex items-center gap-2"
          >
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0"
              style={{
                color: theme.text,
                backgroundColor: theme.card,
                borderColor: theme.border,
              }}
              value={option.label}
              onChange={(event) => handleOptionChange(option.id, event.target.value)}
            />
            <button
              type="button"
              onClick={() => handleRemove(option.id)}
              className="shrink-0 rounded-full border px-2 py-1 text-xs text-red-500 transition hover:bg-red-500/10"
              style={{ borderColor: theme.border }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

type FieldValue = string | string[];

type FormErrors = Record<string, string>;

function FormCanvas({
  fields,
  selectedFieldId,
  onSelectField,
  onReorder,
  onDuplicate,
  onDelete,
  mode,
  formMeta,
  theme,
}: {
  fields: FormField[];
  selectedFieldId: string | null;
  onSelectField: (id: string | null) => void;
  onReorder: (id: string, direction: "up" | "down") => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  mode: BuilderMode;
  formMeta: FormMeta;
  theme: ThemeSnapshot;
}) {
  const fieldSignature = useMemo(
    () => fields.map((field) => field.id).join("|"),
    [fields]
  );

  return (
    <div className="space-y-4">
      <div
        className="rounded-3xl border px-6 py-8 shadow-lg transition"
        style={{
          backgroundColor: theme.card,
          borderColor: theme.border,
          color: theme.text,
        }}
      >
        {mode === "edit" ? (
          <EditableForm
            fields={fields}
            selectedFieldId={selectedFieldId}
            onSelectField={onSelectField}
            onReorder={onReorder}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            formMeta={formMeta}
            theme={theme}
          />
        ) : (
          <InteractiveForm
            key={fieldSignature}
            fields={fields}
            formMeta={formMeta}
            theme={theme}
          />
        )}
      </div>
    </div>
  );
}

function EditableForm({
  fields,
  selectedFieldId,
  onSelectField,
  onReorder,
  onDuplicate,
  onDelete,
  formMeta,
  theme,
}: {
  fields: FormField[];
  selectedFieldId: string | null;
  onSelectField: (id: string | null) => void;
  onReorder: (id: string, direction: "up" | "down") => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  formMeta: FormMeta;
  theme: ThemeSnapshot;
}) {
  return (
    <div className="space-y-6">
      <header>
        <h1 style={tokenStyle(theme.tokens.formTitle)}>{formMeta.title || "Untitled form"}</h1>
        <p className="mt-2" style={{ color: theme.muted }}>
          {formMeta.description || "Add a short description to introduce your form."}
        </p>
      </header>

      {fields.length === 0 ? (
        <div
          className="rounded-2xl border border-dashed px-4 py-12 text-center"
          style={{ borderColor: theme.border, color: theme.muted }}
        >
          Add a field from the sidebar to start building your form.
        </div>
      ) : (
        <div className="space-y-4">
          {fields.map((field, index) => {
            const isSelected = selectedFieldId === field.id;
            return (
              <section
                key={field.id}
                className="rounded-2xl border px-4 py-4 transition"
                style={{
                  borderColor: isSelected ? theme.tokens.button.background : theme.border,
                  backgroundColor: isSelected
                    ? withAlpha(theme.tokens.button.background, 0.1)
                    : theme.panel,
                }}
                onClick={() => onSelectField(field.id)}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide" style={{ color: theme.muted }}>
                      {getFieldLabel(field.type)}
                    </p>
                    <p className="text-sm font-semibold" style={{ color: theme.text }}>
                      {field.label || "Untitled question"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onReorder(field.id, "up");
                      }}
                      className="rounded-full border px-2 py-1 transition"
                      style={{
                        borderColor: theme.border,
                        color: theme.text,
                        opacity: index === 0 ? 0.4 : 1,
                      }}
                      disabled={index === 0}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onReorder(field.id, "down");
                      }}
                      className="rounded-full border px-2 py-1 transition"
                      style={{
                        borderColor: theme.border,
                        color: theme.text,
                        opacity: index === fields.length - 1 ? 0.4 : 1,
                      }}
                      disabled={index === fields.length - 1}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDuplicate(field.id);
                      }}
                      className="rounded-full border px-2 py-1 transition hover:bg-black/5"
                      style={{ borderColor: theme.border, color: theme.text }}
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDelete(field.id);
                      }}
                      className="rounded-full border px-2 py-1 text-red-500 transition hover:bg-red-500/10"
                      style={{ borderColor: theme.border }}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="pointer-events-none mt-4">
                  <FieldRenderer field={field} theme={theme} readOnly />
                </div>

                {isSelected && (
                  <p className="mt-3 text-xs" style={{ color: theme.muted }}>
                    Editing this field. Adjust settings from the sidebar.
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InteractiveForm({
  fields,
  formMeta,
  theme,
}: {
  fields: FormField[];
  formMeta: FormMeta;
  theme: ThemeSnapshot;
}) {
  const createInitialValues = () => {
    const values: Record<string, FieldValue> = {};
    fields.forEach((field) => {
      values[field.id] = field.type === "checkbox" ? [] : "";
    });
    return values;
  };

  const [values, setValues] = useState<Record<string, FieldValue>>(createInitialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitState, setSubmitState] = useState<"idle" | "success">("idle");

  const handleChange = (id: string, newValue: FieldValue) => {
    setValues((prev) => ({ ...prev, [id]: newValue }));
    setErrors((prev) => {
      if (prev[id]) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return prev;
    });
  };

  const validate = () => {
    const nextErrors: FormErrors = {};
    fields.forEach((field) => {
      const value = values[field.id];
      const error = validateField(field, value);
      if (error) {
        nextErrors[field.id] = error;
      }
    });
    setErrors(nextErrors);
    return nextErrors;
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const validation = validate();

    if (Object.keys(validation).length === 0) {
      setSubmitState("success");
    } else {
      setSubmitState("idle");
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      <header>
        <h1 style={tokenStyle(theme.tokens.formTitle)}>{formMeta.title || "Untitled form"}</h1>
        <p className="mt-2" style={{ color: theme.muted }}>
          {formMeta.description || "Add a description to inform your audience."}
        </p>
      </header>

      {fields.length === 0 ? (
        <div
          className="rounded-2xl border border-dashed px-4 py-12 text-center"
          style={{ borderColor: theme.border, color: theme.muted }}
        >
          Your form is empty. Add fields in edit mode and return here to preview.
        </div>
      ) : (
        <div className="space-y-5">
          {fields.map((field) => (
            <FieldRenderer
              key={field.id}
              field={field}
              theme={theme}
              value={values[field.id]}
              onChange={(value) => handleChange(field.id, value)}
              error={errors[field.id]}
            />
          ))}
        </div>
      )}

      <button
        type="submit"
        className="w-full rounded-xl px-4 py-3 text-sm font-semibold transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2"
        style={{
          color: theme.tokens.button.color,
          backgroundColor: theme.tokens.button.background,
          borderColor: theme.tokens.button.borderColor ?? theme.border,
          fontFamily: theme.tokens.button.fontFamily,
          fontSize: theme.tokens.button.fontSize,
          fontWeight: theme.tokens.button.fontWeight,
        }}
      >
        {formMeta.submitLabel || "Submit"}
      </button>
      {submitState === "success" && (
        <p
          className="rounded-2xl border px-4 py-3 text-center text-sm"
          style={{
            borderColor: theme.border,
            backgroundColor: withAlpha(theme.tokens.button.background, 0.12),
            color: theme.tokens.button.background,
          }}
        >
          Thanks! Your responses look great. Adjust the form in edit mode any time.
        </p>
      )}
    </form>
  );
}

function FieldRenderer({
  field,
  theme,
  value,
  onChange,
  readOnly,
  error,
}: {
  field: FormField;
  theme: ThemeSnapshot;
  value?: FieldValue;
  onChange?: (value: FieldValue) => void;
  readOnly?: boolean;
  error?: string;
}) {
  const labelStyle = tokenStyle(theme.tokens.label);
  const helperStyle = tokenStyle(theme.tokens.helper);
  const inputToken = theme.tokens.input;

  const baseInputStyle: CSSProperties = {
    color: inputToken.color,
    backgroundColor: inputToken.background ?? theme.card,
    borderColor: inputToken.borderColor ?? theme.border,
    fontFamily: inputToken.fontFamily,
    fontSize: inputToken.fontSize,
    fontWeight: inputToken.fontWeight,
  };

  const commonInputClass =
    "mt-2 w-full rounded-lg border px-4 py-3 text-sm transition focus:outline-none focus:ring-2 focus:ring-offset-0";

  const disabledProps = readOnly ? { disabled: true } : {};

  const renderHelperText = () => {
    if (!field.description) return null;
    return (
      <p className="mt-1" style={helperStyle}>
        {field.description}
      </p>
    );
  };

  return (
    <fieldset className="space-y-2" disabled={readOnly}>
      <legend className="sr-only">{field.label}</legend>
      <label className="block text-sm font-medium" style={labelStyle}>
        <span className="flex items-center gap-2">
          {field.label || "Untitled question"}
          {field.required && <span className="text-xs" style={{ color: theme.muted }}>*</span>}
        </span>
        {renderHelperText()}

        {(() => {
          switch (field.type) {
            case "short_text":
              return (
                <input
                  type="text"
                  className={commonInputClass}
                  style={baseInputStyle}
                  placeholder={field.placeholder}
                  value={(value as string) ?? ""}
                  onChange={(event) => onChange?.(event.target.value)}
                  {...disabledProps}
                />
              );
            case "long_text":
              return (
                <textarea
                  className={commonInputClass}
                  style={baseInputStyle}
                  rows={4}
                  placeholder={field.placeholder}
                  value={(value as string) ?? ""}
                  onChange={(event) => onChange?.(event.target.value)}
                  {...disabledProps}
                />
              );
            case "email":
              return (
                <input
                  type="email"
                  className={commonInputClass}
                  style={baseInputStyle}
                  placeholder={field.placeholder ?? "email@example.com"}
                  value={(value as string) ?? ""}
                  onChange={(event) => onChange?.(event.target.value)}
                  {...disabledProps}
                />
              );
            case "number":
              return (
                <input
                  type="number"
                  className={commonInputClass}
                  style={baseInputStyle}
                  placeholder={field.placeholder ?? "0"}
                  value={(value as string) ?? ""}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  onChange={(event) => onChange?.(event.target.value)}
                  {...disabledProps}
                />
              );
            case "dropdown": {
              const options = field.options ?? [];
              return (
                <select
                  className={commonInputClass}
                  style={baseInputStyle}
                  value={(value as string) ?? ""}
                  onChange={(event) => onChange?.(event.target.value)}
                  {...disabledProps}
                >
                  <option value="">
                    {field.placeholder ?? "Select an option"}
                  </option>
                  {options.map((option) => (
                    <option key={option.id} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              );
            }
            case "checkbox": {
              const options = field.options ?? [];
              const checkboxValues = Array.isArray(value) ? value : [];
              return (
                <div className="mt-3 space-y-2">
                  {options.map((option) => {
                    const checked = checkboxValues.includes(option.value);
                    return (
                      <label
                        key={option.id}
                        className="flex items-center gap-3 rounded-xl border px-3 py-2 text-sm"
                        style={{
                          color: theme.text,
                          backgroundColor: theme.card,
                          borderColor: theme.border,
                        }}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={checked}
                          onChange={(event) => {
                            if (!onChange) return;
                            const next = new Set(checkboxValues);
                            if (event.target.checked) {
                              next.add(option.value);
                            } else {
                              next.delete(option.value);
                            }
                            onChange(Array.from(next));
                          }}
                          disabled={readOnly}
                        />
                        <span>{option.label}</span>
                      </label>
                    );
                  })}
                </div>
              );
            }
            case "date":
              return (
                <input
                  type="date"
                  className={commonInputClass}
                  style={baseInputStyle}
                  value={(value as string) ?? ""}
                  onChange={(event) => onChange?.(event.target.value)}
                  {...disabledProps}
                />
              );
            default:
              return null;
          }
        })()}
      </label>
      {error && (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}

function validateField(field: FormField, value: FieldValue): string | undefined {
  if (field.type === "checkbox") {
    const selections = Array.isArray(value) ? value : [];
    if (field.required && selections.length === 0) {
      return "Please choose at least one option.";
    }
    return undefined;
  }

  const stringValue = (value as string) ?? "";

  if (field.required && stringValue.trim().length === 0) {
    return "This field is required.";
  }

  if (!field.required && stringValue.trim().length === 0) {
    return undefined;
  }

  switch (field.type) {
    case "email": {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(stringValue)) {
        return "Enter a valid email address.";
      }
      break;
    }
    case "number": {
      const numericValue = Number(stringValue);
      if (Number.isNaN(numericValue)) {
        return "Enter a numeric value.";
      }
      if (typeof field.min === "number" && numericValue < field.min) {
        return `Minimum value is ${field.min}.`;
      }
      if (typeof field.max === "number" && numericValue > field.max) {
        return `Maximum value is ${field.max}.`;
      }
      break;
    }
    case "short_text":
    case "long_text": {
      if (typeof field.minLength === "number" && stringValue.length < field.minLength) {
        return `Must be at least ${field.minLength} characters.`;
      }
      if (typeof field.maxLength === "number" && stringValue.length > field.maxLength) {
        return `Cannot exceed ${field.maxLength} characters.`;
      }
      break;
    }
    case "dropdown": {
      if (!stringValue) {
        return "Select an option.";
      }
      break;
    }
    case "date":
    default:
      break;
  }

  return undefined;
}

function ThemePanel({
  theme,
  mode,
  onUpdateSurface,
  onUpdateToken,
}: {
  theme: ThemeSnapshot;
  mode: ThemeMode;
  onUpdateSurface: (key: keyof Omit<ThemeSnapshot, "tokens">, value: string) => void;
  onUpdateToken: (tag: ThemeTag, key: keyof ThemeToken, value: string | number) => void;
}) {
  const surfaceKeys: Array<{ key: keyof Omit<ThemeSnapshot, "tokens">; label: string }> = [
    { key: "background", label: "Canvas" },
    { key: "panel", label: "Sidebar" },
    { key: "card", label: "Card" },
    { key: "border", label: "Border" },
    { key: "text", label: "Text" },
    { key: "muted", label: "Muted" },
  ];

  const themeTags: Array<{ tag: ThemeTag; label: string }> = [
    { tag: "formTitle", label: "Form title" },
    { tag: "sectionTitle", label: "Section title" },
    { tag: "label", label: "Field label" },
    { tag: "helper", label: "Helper text" },
    { tag: "input", label: "Input" },
    { tag: "button", label: "Button" },
  ];

  return (
    <section
      className="rounded-2xl border px-5 py-5 shadow-sm"
      style={{ backgroundColor: theme.panel, borderColor: theme.border }}
    >
      <h2 className="text-sm font-semibold" style={{ color: theme.text }}>
        Theme ({mode} mode)
      </h2>
      <p className="mt-1 text-xs" style={{ color: theme.muted }}>
        Adjust colours and typography with design tokens.
      </p>

      <div className="mt-4 space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: theme.muted }}>
            Surfaces
          </p>
          <div className="grid grid-cols-2 gap-3">
            {surfaceKeys.map((surface) => {
              const colorValue = theme[surface.key];
              return (
                <label
                  key={surface.key}
                  className="flex flex-col rounded-xl border px-3 py-2 text-xs"
                  style={{
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    color: theme.text,
                  }}
                >
                  <span className="font-semibold">{surface.label}</span>
                  <input
                    type="color"
                    className="mt-2 h-10 w-full cursor-pointer rounded"
                    value={normalizeColor(typeof colorValue === "string" ? colorValue : "")}
                    onChange={(event) => onUpdateSurface(surface.key, event.target.value)}
                  />
                </label>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          {themeTags.map(({ tag, label }) => {
            const token = theme.tokens[tag];
            return (
              <details
                key={tag}
                className="rounded-xl border px-4 py-3 text-sm"
                style={{ backgroundColor: theme.card, borderColor: theme.border }}
              >
                <summary className="cursor-pointer list-none">
                  <div className="flex items-center justify-between">
                    <span>{label}</span>
                    <span className="text-xs" style={{ color: theme.muted }}>
                      {token.fontSize} / {token.fontWeight}
                    </span>
                  </div>
                </summary>
                <div className="mt-3 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                  <label className="flex flex-col">
                    Text colour
                    <input
                      type="color"
                      className="mt-2 h-10 cursor-pointer rounded"
                      value={normalizeColor(token.color)}
                      onChange={(event) => onUpdateToken(tag, "color", event.target.value)}
                    />
                  </label>
                  {tag !== "helper" && (
                    <label className="flex flex-col">
                      Background
                      <input
                        type="color"
                        className="mt-2 h-10 cursor-pointer rounded"
                        value={normalizeColor(token.background ?? theme.card)}
                        onChange={(event) => onUpdateToken(tag, "background", event.target.value)}
                      />
                    </label>
                  )}
                  <label className="flex flex-col">
                    Font size
                    <input
                      className="mt-2 rounded border px-2 py-1"
                      style={{ borderColor: theme.border, backgroundColor: theme.panel, color: theme.text }}
                      value={token.fontSize}
                      onChange={(event) => onUpdateToken(tag, "fontSize", event.target.value)}
                      placeholder="16px or 1rem"
                    />
                  </label>
                  <label className="flex flex-col">
                    Font weight
                    <input
                      type="number"
                      min={300}
                      max={800}
                      step={100}
                      className="mt-2 rounded border px-2 py-1"
                      style={{ borderColor: theme.border, backgroundColor: theme.panel, color: theme.text }}
                      value={token.fontWeight}
                      onChange={(event) => onUpdateToken(tag, "fontWeight", Number(event.target.value))}
                    />
                  </label>
                  <label className="flex flex-col">
                    Font family
                    <select
                      className="mt-2 rounded border px-2 py-1"
                      style={{ borderColor: theme.border, backgroundColor: theme.panel, color: theme.text }}
                      value={token.fontFamily}
                      onChange={(event) => onUpdateToken(tag, "fontFamily", event.target.value)}
                    >
                      {fontOptions.map((font) => (
                        <option key={font.value} value={font.value}>
                          {font.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {tag === "input" && (
                    <label className="flex flex-col">
                      Border colour
                      <input
                        type="color"
                        className="mt-2 h-10 cursor-pointer rounded"
                        value={normalizeColor(token.borderColor ?? theme.border)}
                        onChange={(event) => onUpdateToken(tag, "borderColor", event.target.value)}
                      />
                    </label>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function getFieldLabel(type: FieldType): string {
  switch (type) {
    case "short_text":
      return "Short text";
    case "long_text":
      return "Long text";
    case "email":
      return "Email";
    case "number":
      return "Number";
    case "dropdown":
      return "Dropdown";
    case "checkbox":
      return "Checkboxes";
    case "date":
      return "Date";
    default:
      return "Field";
  }
}

function tokenStyle(token: ThemeToken): CSSProperties {
  return {
    color: token.color,
    fontFamily: token.fontFamily,
    fontSize: token.fontSize,
    fontWeight: token.fontWeight,
  };
}

function normalizeColor(value: string): string {
  if (!value) return "#000000";
  if (value.startsWith("#") && (value.length === 7 || value.length === 4)) {
    return value;
  }
  if (typeof document === "undefined") {
    return value;
  }
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return value;
  ctx.fillStyle = value;
  return ctx.fillStyle as string;
}

function withAlpha(hex: string | undefined, alpha: number): string {
  if (!hex) return "rgba(0,0,0,0)";
  const normalized = normalizeColor(hex);
  if (normalized.startsWith("#")) {
    const raw = normalized.slice(1);
    const expanded = raw.length === 3 ? raw.split("").map((char) => char + char).join("") : raw;
    const bigint = parseInt(expanded, 16);
    if (!Number.isNaN(bigint)) {
      const r = (bigint >> 16) & 255;
      const g = (bigint >> 8) & 255;
      const b = bigint & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }
  return normalized;
}
