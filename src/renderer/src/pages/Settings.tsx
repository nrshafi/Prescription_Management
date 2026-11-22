import { open } from '@tauri-apps/plugin-shell'
import { Download, FileJson, RotateCcw, Save, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import {
  type DoctorProfileRecord,
  getPrintFontKey,
  type PaperSettingsRecord,
  PRINT_FONT_STORAGE_KEY,
  PRINT_FONTS
} from '@shared/print'
import {
  type DoctorProfileFormValues,
  JSON_EXPORT_EXAMPLE,
  type PaperSettingsFormValues
} from '@shared/settings'

const defaultDoctor: DoctorProfileFormValues = {
  name: '',
  degrees: '',
  speciality: '',
  phone: '',
  email: '',
  address: '',
  chamber: '',
  logoPath: '',
  signaturePath: ''
}

const defaultPaper: PaperSettingsFormValues = {
  widthMm: 210,
  heightMm: 297,
  marginTop: 10,
  marginBottom: 10,
  marginLeft: 10,
  marginRight: 10
}

const PAPER_FIELD_LABELS: Record<keyof PaperSettingsFormValues, string> = {
  widthMm: 'Width (mm)',
  heightMm: 'Height (mm)',
  marginTop: 'Margin Top (mm)',
  marginBottom: 'Margin Bottom (mm)',
  marginLeft: 'Margin Left (mm)',
  marginRight: 'Margin Right (mm)'
}

function doctorToForm(profile: DoctorProfileRecord): DoctorProfileFormValues {
  return {
    name: profile.name ?? '',
    degrees: profile.degrees ?? '',
    speciality: profile.speciality ?? '',
    phone: profile.phone ?? '',
    email: profile.email ?? '',
    address: profile.address ?? '',
    chamber: profile.chamber ?? '',
    logoPath: profile.logoPath ?? '',
    signaturePath: profile.signaturePath ?? ''
  }
}

function paperToForm(settings: PaperSettingsRecord): PaperSettingsFormValues {
  return {
    widthMm: settings.widthMm,
    heightMm: settings.heightMm,
    marginTop: settings.marginTop,
    marginBottom: settings.marginBottom,
    marginLeft: settings.marginLeft,
    marginRight: settings.marginRight
  }
}

export function Settings(): React.JSX.Element {
  const [doctor, setDoctor] = useState<DoctorProfileFormValues>(defaultDoctor)
  const [paper, setPaper] = useState<PaperSettingsFormValues>(defaultPaper)
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') ?? 'system')
  const [printFont, setPrintFont] = useState(() =>
    getPrintFontKey(localStorage.getItem(PRINT_FONT_STORAGE_KEY))
  )
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [jsonHelpOpen, setJsonHelpOpen] = useState(false)

  useEffect(() => {
    api.settings
      .get()
      .then((settings) => {
        setDoctor(doctorToForm(settings.doctorProfile))
        setPaper(paperToForm(settings.paperSettings))
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load settings.'))
  }, [])

  useEffect(() => {
    localStorage.setItem('theme', theme)
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle(
      'dark',
      theme === 'dark' || (theme === 'system' && prefersDark)
    )
  }, [theme])

  useEffect(() => {
    localStorage.setItem(PRINT_FONT_STORAGE_KEY, printFont)
  }, [printFont])

  async function saveDoctor(): Promise<void> {
    setError(null)
    setStatus(null)
    try {
      const saved = await api.settings.updateDoctorProfile(doctor)
      setDoctor(doctorToForm(saved))
      setStatus('Doctor profile saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save doctor profile.')
    }
  }

  async function savePaper(): Promise<void> {
    setError(null)
    setStatus(null)
    try {
      const saved = await api.settings.updatePaperSettings(paper)
      setPaper(paperToForm(saved))
      setStatus('Paper settings saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save paper settings.')
    }
  }

  async function exportBackup(): Promise<void> {
    setError(null)
    setStatus(null)
    try {
      const result = await api.settings.exportBackup()
      setStatus(result.path ? `Backup exported: ${result.path}` : 'Backup export cancelled.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not export backup.')
    }
  }

  async function importBackup(): Promise<void> {
    setError(null)
    setStatus(null)
    try {
      const result = await api.settings.importBackup()
      if (!result.ok) {
        if (result.message) {
          setError(result.message)
        } else {
          setStatus('Backup import cancelled.')
        }
        return
      }
      const settings = await api.settings.get()
      setDoctor(doctorToForm(settings.doctorProfile))
      setPaper(paperToForm(settings.paperSettings))
      setStatus(`Backup restored${result.path ? ` from ${result.path}` : ''}.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import backup.')
    }
  }

  async function exportJson(): Promise<void> {
    setError(null)
    setStatus(null)
    try {
      const result = await api.settings.exportJson()
      setStatus(result.path ? `JSON exported: ${result.path}` : 'JSON export cancelled.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not export JSON.')
    }
  }

  async function importJson(): Promise<void> {
    setError(null)
    setStatus(null)
    try {
      const result = await api.settings.importJson()
      setJsonHelpOpen(false)
      if (!result.ok) {
        if (result.message) {
          setError(result.message)
        } else {
          setStatus('JSON import cancelled.')
        }
        return
      }
      const settings = await api.settings.get()
      setDoctor(doctorToForm(settings.doctorProfile))
      setPaper(paperToForm(settings.paperSettings))
      setStatus(result.message ?? 'JSON import complete.')
    } catch (err) {
      setJsonHelpOpen(false)
      setError(err instanceof Error ? err.message : 'Could not import JSON.')
    }
  }

  function updatePaper(field: keyof PaperSettingsFormValues, value: string): void {
    setPaper((current) => ({ ...current, [field]: Number(value) }))
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Doctor identity, print paper, theme, and offline safety tools.
        </p>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}
      {status && <p className="text-muted-foreground text-sm">{status}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Doctor Profile</CardTitle>
              <CardDescription>Used by the print renderer header and footer.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Name"
                  value={doctor.name ?? ''}
                  onChange={(value) => setDoctor((current) => ({ ...current, name: value }))}
                />
                <Field
                  label="Degrees"
                  value={doctor.degrees ?? ''}
                  onChange={(value) => setDoctor((current) => ({ ...current, degrees: value }))}
                />
                <Field
                  label="Speciality"
                  value={doctor.speciality ?? ''}
                  onChange={(value) => setDoctor((current) => ({ ...current, speciality: value }))}
                />
                <Field
                  label="Phone"
                  value={doctor.phone ?? ''}
                  onChange={(value) => setDoctor((current) => ({ ...current, phone: value }))}
                />
                <Field
                  label="Email"
                  value={doctor.email ?? ''}
                  onChange={(value) => setDoctor((current) => ({ ...current, email: value }))}
                />
                <Field
                  label="Logo path"
                  value={doctor.logoPath ?? ''}
                  onChange={(value) => setDoctor((current) => ({ ...current, logoPath: value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="doctor-address">Address</Label>
                <Textarea
                  id="doctor-address"
                  value={doctor.address ?? ''}
                  onChange={(event) =>
                    setDoctor((current) => ({ ...current, address: event.target.value }))
                  }
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="doctor-chamber">Chamber</Label>
                <Textarea
                  id="doctor-chamber"
                  value={doctor.chamber ?? ''}
                  onChange={(event) =>
                    setDoctor((current) => ({ ...current, chamber: event.target.value }))
                  }
                  rows={3}
                />
              </div>
              <Field
                label="Signature path"
                value={doctor.signaturePath ?? ''}
                onChange={(value) => setDoctor((current) => ({ ...current, signaturePath: value }))}
              />
              <Button type="button" onClick={saveDoctor}>
                <Save className="size-4" /> Save Doctor Profile
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Theme</CardTitle>
              <CardDescription>Stored locally on this computer.</CardDescription>
            </CardHeader>
            <CardContent>
              <div role="radiogroup" aria-label="Theme" className="flex flex-wrap gap-2">
                {['system', 'light', 'dark'].map((mode) => (
                  <Button
                    key={mode}
                    role="radio"
                    aria-checked={theme === mode}
                    aria-label={mode[0].toUpperCase() + mode.slice(1)}
                    variant={theme === mode ? 'default' : 'outline'}
                    onClick={() => setTheme(mode)}
                  >
                    {mode[0].toUpperCase() + mode.slice(1)}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Paper Settings</CardTitle>
              <CardDescription>Dimensions and margins in millimeters.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                {(Object.keys(paper) as (keyof PaperSettingsFormValues)[]).map((field) => (
                  <div key={field} className="grid gap-2">
                    <Label htmlFor={`paper-${field}`}>{PAPER_FIELD_LABELS[field]}</Label>
                    <Input
                      id={`paper-${field}`}
                      type="number"
                      value={paper[field]}
                      onChange={(event) => updatePaper(field, event.target.value)}
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setPaper(defaultPaper)}
                >
                  <RotateCcw className="size-4" /> A4 Defaults
                </Button>
                <Button type="button" className="flex-1" onClick={savePaper}>
                  <Save className="size-4" /> Save Paper Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Print Font</CardTitle>
              <CardDescription>
                Font used for printed prescriptions. Stored locally on this computer.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {PRINT_FONTS.map((font) => (
                <Button
                  key={font.key}
                  variant={printFont === font.key ? 'default' : 'outline'}
                  onClick={() => setPrintFont(font.key)}
                  style={{ fontFamily: font.stack }}
                >
                  {font.label}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Backup</CardTitle>
              <CardDescription>
                Backup (<code className="font-mono">.db</code>) is a full snapshot you can use to
                restore this computer. JSON is a portable merge of patients, prescriptions, and
                presets only — doctor profile and paper settings are not affected.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={exportBackup}>
                      <Download className="size-4" /> Export Backup
                    </Button>
                    <Button variant="outline" onClick={importBackup}>
                      <Upload className="size-4" /> Import Backup
                    </Button>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Full database snapshot. Importing replaces everything on this computer — doctor
                    profile and paper settings included.
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={exportJson}>
                      <FileJson className="size-4" /> Export JSON
                    </Button>
                    <Dialog open={jsonHelpOpen} onOpenChange={setJsonHelpOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline">
                          <FileJson className="size-4" /> Import JSON
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Import from JSON</DialogTitle>
                          <DialogDescription>
                            Imports are merged into existing data. Patients, prescriptions, and
                            presets are imported; doctor profile and paper settings are ignored. The
                            file must match this format.
                          </DialogDescription>
                        </DialogHeader>
                        <pre className="max-h-96 overflow-auto rounded-md bg-muted p-4 text-xs leading-relaxed">
                          <code>{JSON_EXPORT_EXAMPLE}</code>
                        </pre>
                        <DialogFooter>
                          <Button variant="ghost" onClick={() => setJsonHelpOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={importJson}>
                            <Upload className="size-4" /> Choose File...
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Portable export of patients, prescriptions, and presets. Importing merges into
                    existing data and skips doctor profile and paper settings.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="text-center">
        <p className="text-muted-foreground text-sm">
          Facing issues? Contact the developer on{' '}
          <Button
            type="button"
            variant="link"
            className="h-auto p-0"
            onClick={() => open('https://t.me/nafiur_rahman_shafi')}
          >
            Telegram
          </Button>{' '}
          or{' '}
          <Button
            type="button"
            variant="link"
            className="h-auto p-0"
            onClick={() => open('https://discord.com/users/775961069083951115')}
          >
            Discord
          </Button>
        </p>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange
}: {
  label: string
  value: string
  onChange: (value: string) => void
}): React.JSX.Element {
  const id = `doctor-${label.toLowerCase().replace(/\s+/g, '-')}`
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}
