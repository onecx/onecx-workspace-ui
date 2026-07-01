type Locale = 'de' | 'en'

interface WorkspaceI18n {
  page_title: string
  page_subtitle: string
  create_button_label: string
  import_button_label: string
  create_button_aria: string
  breadcrumb_workspace: string
}

const translations: Record<Locale, WorkspaceI18n> = {
  de: {
    page_title: 'Workspace Verwaltung',
    page_subtitle: 'Erstellung und Bearbeitung von Workspaces',
    create_button_label: 'Erstellen',
    import_button_label: 'Import',
    create_button_aria: 'Einen neuen Workspace erstellen',
    breadcrumb_workspace: 'onecx-workspace',
  },
  en: {
    page_title: 'Workspace Management',
    page_subtitle: 'Creation and editing of Workspaces',
    create_button_label: 'Create',
    import_button_label: 'Import',
    create_button_aria: 'Create a new workspace',
    breadcrumb_workspace: 'onecx-workspace',
  },
}

function resolveLocale(): Locale {
  const raw = (process.env.LOCALE ?? 'en').toLowerCase()
  if (raw.startsWith('en')) return 'en'
  return 'de'
}

const activeLocale = resolveLocale()

/**
 * Returns the locale-specific translation for the given key.
 * Active locale is driven by process.env.LOCALE (default: 'de-DE').
 * Throws on unknown key so typos fail at test time, not silently.
 *
 * For other MFEs: create a sibling *-i18n.ts file with the same pattern
 * and a typed interface for that MFE's strings.
 */
export function t(key: keyof WorkspaceI18n): string {
  const value = translations[activeLocale][key]
  if (value === undefined) {
    throw new Error(`i18n: unknown key "${key}" for locale "${activeLocale}"`)
  }
  return value
}
