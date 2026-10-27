import { useEffect, useState } from 'react';

import { Button } from '@race/ui';

import { Modal } from './modal';

export type FormFieldConfig = {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'number' | 'select' | 'date';
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
  /** Show this field only when another select field has one of these values. */
  showWhen?: { field: string; values: string[] };
};

export type FormSection = {
  title: string;
  description?: string;
  fields: FormFieldConfig[];
};

const FORM_ID = 'entity-form-modal';

const inputClass =
  'flex h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-heading placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

function isFieldVisible(
  field: FormFieldConfig,
  values: Record<string, string>,
): boolean {
  if (!field.showWhen) return true;
  const current = values[field.showWhen.field];
  return field.showWhen.values.includes(current ?? '');
}

export function EntityFormModal({
  open,
  onClose,
  title,
  description,
  fields,
  sections,
  initialValues = {},
  resetKey,
  onSubmit,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** Flat field list (rendered without section headers). */
  fields?: FormFieldConfig[];
  /** Grouped fields with headings. Use `sections` OR `fields`, not both. */
  sections?: FormSection[];
  initialValues?: Record<string, string>;
  resetKey?: string;
  onSubmit: (values: Record<string, string>) => void | Promise<void>;
  loading?: boolean;
}) {
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [error, setError] = useState<string | null>(null);

  const allFields: FormFieldConfig[] = sections
    ? sections.flatMap((section) => section.fields)
    : fields ?? [];

  useEffect(() => {
    if (open) {
      setValues(initialValues);
      setError(null);
    }
  }, [open, resetKey, initialValues]);

  const validate = () => {
    for (const field of allFields) {
      if (!isFieldVisible(field, values)) continue;
      if (field.required && !values[field.name]?.trim()) {
        return `${field.label} is required`;
      }
    }
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      // Only submit fields that are actually visible (conditional groups may
      // hold stale values from a previously selected option).
      const visibleValues: Record<string, string> = {};
      for (const field of allFields) {
        if (isFieldVisible(field, values)) {
          visibleValues[field.name] = values[field.name] ?? '';
        }
      }
      await onSubmit(visibleValues);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    }
  };

  const renderField = (field: FormFieldConfig) => {
    if (!isFieldVisible(field, values)) return null;
    return (
      <div key={field.name}>
        <label className="mb-1.5 block text-sm font-semibold text-heading">
          {field.label}
          {field.required ? <span className="text-error"> *</span> : null}
        </label>
        {field.type === 'select' ? (
          <select
            className={inputClass}
            value={values[field.name] ?? ''}
            required={field.required}
            onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
          >
            <option value="" disabled>
              {field.placeholder ?? `Select ${field.label.toLowerCase()}`}
            </option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={field.type ?? 'text'}
            className={inputClass}
            placeholder={field.placeholder ?? `Enter ${field.label.toLowerCase()}`}
            required={field.required}
            value={values[field.name] ?? ''}
            onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
          />
        )}
      </div>
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <p className="rounded-lg border border-error/20 bg-error/10 px-3 py-2 text-sm text-error">
            {error}
          </p>
        ) : null}
        {sections
          ? sections.map((section) => (
              <fieldset key={section.title} className="space-y-4">
                <legend className="mb-1 w-full border-b border-border pb-1.5 text-sm font-bold uppercase tracking-wide text-muted">
                  {section.title}
                </legend>
                {section.description ? (
                  <p className="-mt-2 text-xs text-muted">{section.description}</p>
                ) : null}
                {section.fields.map(renderField)}
              </fieldset>
            ))
          : (fields ?? []).map(renderField)}
      </form>
    </Modal>
  );
}
