import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/**
 * Global realtime listener for inbound emails and outgoing reply delivery
 * updates. Mounted once inside SuperAdminLayout so admins see toasts on any
 * admin page.
 */
const MailRealtimeToasts = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const channel = supabase
      .channel("admin-mail-toasts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "inbound_emails" },
        (payload) => {
          const row = payload.new as {
            id: string;
            from_email: string;
            from_name: string | null;
            subject: string | null;
          };
          toast.success(
            `New email from ${row.from_name || row.from_email}`,
            {
              id: `inbound-${row.id}`,
              description: row.subject || "(no subject)",
              action: {
                label: "Open",
                onClick: () => navigate("/superadmin/inbox"),
              },
            },
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_replies" },
        (payload) => {
          const row = payload.new as {
            id: string;
            recipient_email: string;
            subject: string;
            status: string;
          };
          const status = (row.status || "").toLowerCase();
          if (status === "failed" || status === "error" || status === "bounced") {
            toast.error(`Reply to ${row.recipient_email} failed`, {
              id: `reply-${row.id}`,
              description: row.subject,
              action: {
                label: "Open",
                onClick: () => navigate("/superadmin/inbox"),
              },
            });
          } else if (status === "pending" || status === "queued") {
            toast(`Reply queued for ${row.recipient_email}`, {
              id: `reply-${row.id}`,
              description: row.subject,
            });
          } else {
            toast.success(`Reply delivered to ${row.recipient_email}`, {
              id: `reply-${row.id}`,
              description: row.subject,
            });
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "admin_replies" },
        (payload) => {
          const row = payload.new as {
            id: string;
            recipient_email: string;
            subject: string;
            status: string;
          };
          const prev = (payload.old as { status?: string } | null)?.status;
          if (!prev || prev === row.status) return;
          const status = (row.status || "").toLowerCase();
          if (status === "failed" || status === "error" || status === "bounced") {
            toast.error(`Delivery failed: ${row.recipient_email}`, {
              id: `reply-update-${row.id}`,
              description: row.subject,
              action: {
                label: "Open",
                onClick: () => navigate("/superadmin/inbox"),
              },
            });
          } else if (status === "sent" || status === "delivered") {
            toast.success(`Delivered to ${row.recipient_email}`, {
              id: `reply-update-${row.id}`,
              description: row.subject,
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [navigate]);

  return null;
};

export default MailRealtimeToasts;
