/// <reference types="npm:@types/react@18.3.1" />
// Lightweight drop-in replacement for `@react-email/components` to keep the
// edge function bundle well under Supabase's ~10MB limit.
//
// We deliberately AVOID `react-dom/server` here because that package
// (and its transitive deps) push the bundled function past the 10MB cap
// once you have many templates. Instead we walk the React element tree
// ourselves and emit static HTML — React is only used for `createElement`
// (a tiny object factory), nothing more.

import * as React from 'npm:react@18.3.1'

type AnyProps = Record<string, any> & { children?: React.ReactNode; style?: React.CSSProperties }


const make = (tag: string) =>
  ({ children, ...rest }: AnyProps) => React.createElement(tag, rest, children)

export const Html: React.FC<AnyProps & { lang?: string; dir?: string }> = ({ children, lang, dir, ...rest }) =>
  React.createElement('html', { lang, dir, ...rest }, children)

export const Head: React.FC<AnyProps> = ({ children, ...rest }) =>
  React.createElement(
    'head',
    rest,
    React.createElement('meta', { charSet: 'utf-8' }),
    React.createElement('meta', { name: 'viewport', content: 'width=device-width, initial-scale=1' }),
    children,
  )

export const Body: React.FC<AnyProps> = make('body')
export const Container: React.FC<AnyProps> = ({ children, style, ...rest }) =>
  React.createElement('div', { style: { maxWidth: '600px', margin: '0 auto', ...(style || {}) }, ...rest }, children)
export const Section: React.FC<AnyProps> = make('div')
export const Row: React.FC<AnyProps> = ({ children, style, ...rest }) =>
  React.createElement('table', { width: '100%', cellPadding: 0, cellSpacing: 0, role: 'presentation', style, ...rest },
    React.createElement('tbody', null, React.createElement('tr', null, children)))
export const Column: React.FC<AnyProps> = make('td')
export const Text: React.FC<AnyProps> = make('p')
export const Heading: React.FC<AnyProps & { as?: string }> = ({ as = 'h1', children, ...rest }) =>
  React.createElement(as, rest, children)
export const Hr: React.FC<AnyProps> = ({ style, ...rest }) =>
  React.createElement('hr', { style: { border: 'none', borderTop: '1px solid #e6e6ee', ...(style || {}) }, ...rest })
export const Img: React.FC<AnyProps & { src: string; alt?: string; width?: string | number; height?: string | number }> = (props) =>
  React.createElement('img', { border: 0, ...props })
export const Link: React.FC<AnyProps & { href?: string }> = ({ children, href, style, ...rest }) =>
  React.createElement('a', { href, target: '_blank', rel: 'noopener noreferrer', style: { color: '#635bff', ...(style || {}) }, ...rest }, children)
export const Button: React.FC<AnyProps & { href?: string }> = ({ children, href, style, ...rest }) =>
  React.createElement('a', {
    href,
    target: '_blank',
    rel: 'noopener noreferrer',
    style: {
      display: 'inline-block', padding: '12px 22px', borderRadius: '10px',
      backgroundColor: '#1a1f36', color: '#ffffff', textDecoration: 'none',
      fontWeight: 600, fontSize: '14px', ...(style || {}),
    },
    ...rest,
  }, children)
export const Preview: React.FC<AnyProps> = ({ children }) =>
  React.createElement('div', {
    style: { display: 'none', overflow: 'hidden', lineHeight: '1px', opacity: 0, maxHeight: 0, maxWidth: 0 },
  }, children)

function htmlToText(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<head\b[\s\S]*?<\/head>/gi, '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(p|div|section|tr|li|h[1-6])\s*>/gi, '\n')
    .replace(/<[^<>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}


// ---------------------------------------------------------------------------
// Tiny React-element → HTML serializer (no react-dom/server)
// ---------------------------------------------------------------------------

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
])

const BOOLEAN_ATTRS = new Set([
  'allowfullscreen', 'async', 'autofocus', 'autoplay', 'checked', 'controls',
  'default', 'defer', 'disabled', 'hidden', 'ismap', 'loop', 'multiple',
  'muted', 'novalidate', 'open', 'readonly', 'required', 'reversed',
  'selected',
])

// React camelCase → HTML kebab-case for attribute names.
const ATTR_NAME_MAP: Record<string, string> = {
  className: 'class',
  htmlFor: 'for',
  charSet: 'charset',
  httpEquiv: 'http-equiv',
  acceptCharset: 'accept-charset',
  cellPadding: 'cellpadding',
  cellSpacing: 'cellspacing',
  colSpan: 'colspan',
  rowSpan: 'rowspan',
  tabIndex: 'tabindex',
  readOnly: 'readonly',
  maxLength: 'maxlength',
  minLength: 'minlength',
  noValidate: 'novalidate',
  autoComplete: 'autocomplete',
  autoFocus: 'autofocus',
  autoPlay: 'autoplay',
  contentEditable: 'contenteditable',
  spellCheck: 'spellcheck',
}

function camelToKebab(name: string): string {
  return name.replace(/([A-Z])/g, '-$1').toLowerCase()
}

function attrName(name: string): string {
  if (ATTR_NAME_MAP[name]) return ATTR_NAME_MAP[name]
  if (name.startsWith('data-') || name.startsWith('aria-')) return name
  return name
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function styleToString(style: Record<string, any>): string {
  return Object.entries(style)
    .filter(([, v]) => v !== null && v !== undefined && v !== false)
    .map(([k, v]) => {
      const prop = k.startsWith('--') ? k : camelToKebab(k)
      const val = typeof v === 'number' && !UNITLESS_CSS.has(k) ? `${v}px` : String(v)
      return `${prop}:${val}`
    })
    .join(';')
}

const UNITLESS_CSS = new Set([
  'animationIterationCount', 'columnCount', 'flex', 'flexGrow', 'flexShrink',
  'fontWeight', 'lineHeight', 'opacity', 'order', 'orphans', 'widows',
  'zIndex', 'zoom',
])

function renderProps(props: Record<string, any>): string {
  const out: string[] = []
  for (const key of Object.keys(props)) {
    if (key === 'children' || key === 'key' || key === 'ref') continue
    const value = props[key]
    if (value === null || value === undefined || value === false) continue
    if (key === 'style' && typeof value === 'object') {
      const css = styleToString(value)
      if (css) out.push(`style="${escapeAttr(css)}"`)
      continue
    }
    if (key === 'dangerouslySetInnerHTML') continue
    const name = attrName(key)
    if (value === true) {
      if (BOOLEAN_ATTRS.has(name)) out.push(name)
      else out.push(`${name}=""`)
      continue
    }
    out.push(`${name}="${escapeAttr(String(value))}"`)
  }
  return out.length ? ' ' + out.join(' ') : ''
}

function renderChildren(children: any): string {
  if (children === null || children === undefined || children === false || children === true) return ''
  if (Array.isArray(children)) return children.map(renderChildren).join('')
  if (typeof children === 'string') return escapeHtml(children)
  if (typeof children === 'number') return escapeHtml(String(children))
  return renderElement(children)
}

function renderElement(element: any): string {
  if (element === null || element === undefined || element === false || element === true) return ''
  if (typeof element === 'string') return escapeHtml(element)
  if (typeof element === 'number') return escapeHtml(String(element))
  if (Array.isArray(element)) return element.map(renderElement).join('')

  if (!element || typeof element !== 'object' || !('type' in element)) return ''

  const { type, props = {} } = element as { type: any; props: Record<string, any> }

  // Function / class components — invoke and render their output.
  if (typeof type === 'function') {
    const rendered = type(props)
    return renderElement(rendered)
  }

  // React.Fragment
  if (type === React.Fragment || type === undefined || type === null) {
    return renderChildren(props.children)
  }

  if (typeof type !== 'string') return renderChildren(props.children)

  const tag = type.toLowerCase()
  const attrs = renderProps(props)

  if (VOID_ELEMENTS.has(tag)) return `<${tag}${attrs}/>`

  // Style/script tags: don't HTML-escape their text content.
  if (tag === 'style' || tag === 'script') {
    const raw = props.dangerouslySetInnerHTML?.__html
    const inner = raw !== undefined
      ? String(raw)
      : (typeof props.children === 'string' ? props.children : '')
    return `<${tag}${attrs}>${inner}</${tag}>`
  }

  const inner = props.dangerouslySetInnerHTML?.__html ?? renderChildren(props.children)
  return `<${tag}${attrs}>${inner}</${tag}>`
}

export function renderAsync(
  element: React.ReactElement,
  opts?: { plainText?: boolean },
): Promise<string> {
  const markup = renderElement(element)
  if (opts?.plainText) return Promise.resolve(htmlToText(markup))
  return Promise.resolve(`<!DOCTYPE html>${markup}`)
}

