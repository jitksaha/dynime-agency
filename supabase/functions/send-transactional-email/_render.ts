/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { renderAsync } from '../_shared/transactional-email-templates/_components.tsx'
import {
  BrandFooter,
  renderBrandFooterText,
  type BrandFooterProps,
} from '../_shared/transactional-email-templates/brand-footer.tsx'
import type { TemplateEntry } from '../_shared/transactional-email-templates/registry.ts'

export async function loadBrandFooterProps(supabase: any): Promise<BrandFooterProps> {
  try {
    const { data } = await supabase
      .from('contact_info')
      .select('type, value, label, sort_order')
      .order('sort_order', { ascending: true })
    const rows = (data || []) as Array<{ type: string; value: string; label?: string }>
    const hq = rows.find((r) => r.type === 'address')?.value
    const socials: BrandFooterProps['socials'] = {}
    let communityUrl: string | undefined
    for (const r of rows) {
      const v = String(r.value || '').trim()
      if (!v) continue
      const t = String(r.type || '').toLowerCase()
      const l = String(r.label || '').toLowerCase()
      if (t === 'facebook' || l.includes('facebook')) socials.facebook ||= v
      else if (t === 'twitter' || t === 'x' || l.includes('twitter') || l === 'x') socials.twitter ||= v
      else if (t === 'linkedin' || l.includes('linkedin')) socials.linkedin ||= v
      else if (t === 'instagram' || l.includes('instagram')) socials.instagram ||= v
      else if (t === 'community' || l.includes('community')) communityUrl ||= v
    }
    return { hqAddress: hq, socials, communityUrl }
  } catch {
    return {}
  }
}

async function renderBrandFooterHtml(props: BrandFooterProps): Promise<string> {
  const wrapper = React.createElement(
    'html',
    null,
    React.createElement('body', null, React.createElement(BrandFooter, props)),
  )
  const full = await renderAsync(wrapper)
  const m = full.match(/<body[^>]*>([\s\S]*)<\/body>/i)
  return m ? m[1] : ''
}

function injectFooterHtml(html: string, footerHtml: string): string {
  if (!footerHtml) return html
  if (/<\/body\s*>/i.test(html)) {
    return html.replace(/<\/body\s*>/i, `${footerHtml}</body>`)
  }
  return `${html}${footerHtml}`
}

export interface RenderedEmail {
  html: string
  plainText: string
  subject: string
}

export async function renderTemplate(
  template: TemplateEntry,
  templateData: Record<string, any>,
  supabase: any,
): Promise<RenderedEmail> {
  let html = await renderAsync(React.createElement(template.component, templateData))
  let plainText = await renderAsync(
    React.createElement(template.component, templateData),
    { plainText: true },
  )

  try {
    const footerProps = await loadBrandFooterProps(supabase)
    const footerHtml = await renderBrandFooterHtml(footerProps)
    html = injectFooterHtml(html, footerHtml)
    plainText = `${plainText}\n${renderBrandFooterText(footerProps)}`
  } catch { /* footer is best-effort */ }

  const subject =
    typeof template.subject === 'function' ? template.subject(templateData) : template.subject

  return { html, plainText, subject }
}
