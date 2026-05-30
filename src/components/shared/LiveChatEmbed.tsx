import { useEffect } from "react";
import { useSiteSettings } from "@/hooks/use-data";

/**
 * Injects a third-party live chat embed snippet (e.g. LiveChat.com) into the page.
 * The raw HTML snippet is stored in site_settings under `live_chat_embed` and can be
 * updated from Admin → Settings without a redeploy.
 */
const INJECTED_FLAG = "data-live-chat-embed";

const clearInjected = () => {
  document.querySelectorAll(`[${INJECTED_FLAG}]`).forEach((el) => el.remove());
  // Best-effort tear-down of the LiveChat widget if it was already booted
  const w = window as any;
  try {
    if (w.LiveChatWidget?.call) w.LiveChatWidget.call("destroy");
  } catch {
    /* ignore */
  }
  delete w.__lc;
  delete w.LiveChatWidget;
};

const injectSnippet = (html: string) => {
  if (!html.trim()) return;

  // Extract inline + remote <script> tags
  const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = scriptRegex.exec(html)) !== null) {
    const attrs = match[1] || "";
    const body = match[2] || "";
    const srcMatch = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(attrs);
    const script = document.createElement("script");
    script.setAttribute(INJECTED_FLAG, "true");
    if (srcMatch) {
      script.src = srcMatch[1];
      script.async = /\basync\b/i.test(attrs);
      script.defer = /\bdefer\b/i.test(attrs);
    } else {
      script.text = body;
    }
    document.body.appendChild(script);
  }
};

const LiveChatEmbed = () => {
  const { data: settings } = useSiteSettings();
  const snippet = settings?.live_chat_embed || "";
  const enabled = (settings?.live_chat_enabled ?? "true") !== "false";

  useEffect(() => {
    clearInjected();
    if (enabled && snippet.trim()) {
      injectSnippet(snippet);
    }
    return clearInjected;
  }, [snippet, enabled]);

  return null;
};

export default LiveChatEmbed;
