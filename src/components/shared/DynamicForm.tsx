import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useFormTemplate, useSubmitForm } from "@/hooks/use-data";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Send } from "lucide-react";

interface DynamicFormProps {
  slug: string;
}

const DynamicForm = ({ slug }: DynamicFormProps) => {
  const { data: form, isLoading } = useFormTemplate(slug);
  const submitForm = useSubmitForm();
  const [values, setValues] = useState<Record<string, string>>({});
  const [searchParams] = useSearchParams();

  // Prefill from URL query params (?service=, ?subject=, ?message=, etc.)
  // Matches by field id, by lowercased label, or by matching field type (e.g. "message" → textarea field)
  useEffect(() => {
    if (!form) return;
    const fields = (form.fields as any[]) || [];
    const initial: Record<string, string> = {};
    const queryService = searchParams.get("service");
    const querySubject = searchParams.get("subject");
    const queryMessage = searchParams.get("message");

    fields.forEach((f: any) => {
      const labelSlug = String(f.label || "").toLowerCase().trim();
      const direct = searchParams.get(f.id);
      if (direct) {
        initial[f.id] = direct;
        return;
      }
      if (querySubject && (labelSlug.includes("subject") || labelSlug.includes("service") || labelSlug.includes("topic"))) {
        initial[f.id] = querySubject;
        return;
      }
      if (queryService && labelSlug.includes("service")) {
        initial[f.id] = queryService;
        return;
      }
      if (queryMessage && (f.type === "textarea" || labelSlug.includes("message") || labelSlug.includes("detail"))) {
        initial[f.id] = queryMessage;
      }
    });
    if (Object.keys(initial).length > 0) {
      setValues((prev) => ({ ...initial, ...prev }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    // Validate required fields
    const fields = (form.fields as any[]) || [];
    for (const field of fields) {
      if (field.required && !values[field.id]?.trim()) {
        toast.error(`${field.label} is required`);
        return;
      }
    }

    submitForm.mutate(
      { formId: form.id, data: values },
      {
        onSuccess: () => {
          toast.success("Thank you! We'll get back to you within 24 hours.");
          setValues({});
        },
        onError: () => toast.error("Failed to submit. Please try again."),
      }
    );
  };

  if (isLoading) return <div className="text-muted-foreground text-sm">Loading form...</div>;
  if (!form) return null;

  const fields = (form.fields as any[]) || [];

  return (
    <form onSubmit={handleSubmit} className="glass-card p-8 space-y-6">
      {fields.map((field: any) => (
        <div key={field.id}>
          <label className="text-sm text-muted-foreground mb-1 block">{field.label}{field.required && " *"}</label>
          {field.type === "textarea" ? (
            <textarea
              required={field.required}
              placeholder={field.placeholder}
              value={values[field.id] || ""}
              onChange={(e) => setValues({ ...values, [field.id]: e.target.value })}
              rows={5}
              className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          ) : field.type === "select" ? (
            <select
              required={field.required}
              value={values[field.id] || ""}
              onChange={(e) => setValues({ ...values, [field.id]: e.target.value })}
              className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Select...</option>
              {(field.options || []).map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          ) : (
            <input
              type={field.type}
              required={field.required}
              placeholder={field.placeholder}
              value={values[field.id] || ""}
              onChange={(e) => setValues({ ...values, [field.id]: e.target.value })}
              className="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          )}
        </div>
      ))}
      <Button variant="hero" size="lg" type="submit" className="w-full" disabled={submitForm.isPending}>
        <Send className="w-4 h-4 mr-2" /> {submitForm.isPending ? "Sending..." : "Send Message"}
      </Button>
    </form>
  );
};

export default DynamicForm;
