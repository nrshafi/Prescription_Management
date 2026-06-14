import { useEffect, useLayoutEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { PrescriptionSectionType } from '../../../shared/prescription'
import {
  getPrintFontStack,
  PRINT_FONT_STORAGE_KEY,
  type PrescriptionPrintData
} from '../../../shared/print'

const SECTION_LABELS: Record<PrescriptionSectionType, string> = {
  'Chief Complaint': 'C/C',
  Examination: 'O/E',
  Investigations: 'Inv',
  'Provisional Diagnosis': 'Diagnosis',
  Advice: 'Advice',
  'Follow Up': 'Follow Up'
}

function valueOrDash(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString()
}

function lines(value: string | null | undefined): string[] {
  return (value ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function SectionLines({
  sectionId,
  content
}: {
  sectionId: number
  content: string | null | undefined
}): React.JSX.Element {
  return (
    <div className="mt-1 space-y-1 leading-5">
      {lines(content).map((line, index) => {
        // biome-ignore lint/suspicious/noArrayIndexKey: lines are static print text and may repeat
        return <p key={`${sectionId}-${index}`}>{line}</p>
      })}
    </div>
  )
}

function FollowUpLine({ content }: { content: string | null | undefined }): React.JSX.Element {
  const line = lines(content)[0] ?? ''
  return (
    <div className="mt-1 space-y-1 leading-5">
      <p>
        <strong>Follow up:</strong> {line.replace(/^Follow up:\s*/i, '')}
      </p>
    </div>
  )
}

interface PrintRendererProps {
  prescriptionId: number | null
}

export function PrintRenderer({ prescriptionId }: PrintRendererProps): React.JSX.Element {
  const [data, setData] = useState<PrescriptionPrintData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!prescriptionId) {
      setError('Missing prescription id.')
      return
    }

    let cancelled = false
    api.printing
      .data(prescriptionId)
      .then((loaded) => {
        if (!cancelled) {
          setData(loaded)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load print data.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [prescriptionId])

  useLayoutEffect(() => {
    if (!prescriptionId) {
      api.printing.ready()
      return
    }

    if (error) {
      api.printing.ready()
      return
    }

    if (!data) return

    let cancelled = false
    void (async () => {
      await document.fonts.ready
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      })
      if (!cancelled) api.printing.ready()
    })()

    return () => {
      cancelled = true
    }
  }, [prescriptionId, data, error])

  const paper = data?.paperSettings
  const pageStyle = paper
    ? `
      @page {
        size: ${paper.widthMm}mm ${paper.heightMm}mm;
        margin: ${paper.marginTop}mm ${paper.marginRight}mm ${paper.marginBottom}mm ${paper.marginLeft}mm;
      }

      .print-sheet {
        width: ${paper.widthMm}mm;
        min-height: ${paper.heightMm}mm;
        padding: ${paper.marginTop}mm ${paper.marginRight}mm ${paper.marginBottom}mm ${paper.marginLeft}mm;
      }

      @media print {
        body { background: white; }
        .print-shell { padding: 0; background: white; }
        .print-sheet {
          width: ${paper.widthMm}mm;
          min-height: auto;
          padding: ${paper.marginTop}mm ${paper.marginRight}mm ${paper.marginBottom}mm ${paper.marginLeft}mm;
          box-shadow: none;
        }
      }
    `
    : ''

  if (error) {
    return (
      <div className="print-shell min-h-screen bg-neutral-100 p-8 text-neutral-950">
        <div
          data-print-content
          className="mx-auto max-w-xl rounded-md bg-white p-8 text-neutral-950 shadow"
        >
          {error}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="print-shell min-h-screen bg-neutral-100 p-8 text-neutral-950">
        <div className="mx-auto max-w-xl rounded-md bg-white p-8 shadow">
          Preparing print preview...
        </div>
      </div>
    )
  }

  const { doctorProfile, prescription } = data
  const contact = [doctorProfile.phone, doctorProfile.email].filter(Boolean).join(' | ')
  const sections = prescription.sections.filter((section) => lines(section.content).length > 0)
  const printFontStack = getPrintFontStack(localStorage.getItem(PRINT_FONT_STORAGE_KEY))

  return (
    <div className="print-shell min-h-screen bg-neutral-100 p-6 text-neutral-950 print:bg-white">
      <style>{pageStyle}</style>
      <article
        data-print-content
        className="print-sheet mx-auto bg-white text-neutral-950 shadow-xl print:shadow-none"
        style={{ fontFamily: printFontStack }}
      >
        <header className="border-b-2 border-neutral-900 pb-4">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-xs font-semibold tracking-[0.3em] uppercase">Prescription</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">
                {doctorProfile.name || 'Doctor Profile'}
              </h1>
              {doctorProfile.degrees && (
                <p className="mt-1 text-sm font-semibold">{doctorProfile.degrees}</p>
              )}
              {doctorProfile.speciality && <p className="text-sm">{doctorProfile.speciality}</p>}
            </div>
            <div className="max-w-[45%] text-right text-xs leading-5">
              {doctorProfile.chamber && <p className="font-semibold">{doctorProfile.chamber}</p>}
              {doctorProfile.address && <p>{doctorProfile.address}</p>}
              {contact && <p>{contact}</p>}
            </div>
          </div>
        </header>

        <section className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 border-b border-neutral-300 pb-3 text-sm">
          <p>
            <span className="font-semibold">Patient:</span> {prescription.patientName}
          </p>
          <p>
            <span className="font-semibold">Date:</span> {formatDate(prescription.createdAt)}
          </p>
          <p>
            <span className="font-semibold">Patient ID:</span> {prescription.patientCode}
          </p>
          <p>
            <span className="font-semibold">Pres ID:</span> {prescription.id} / Visit{' '}
            {prescription.visitNo}
          </p>
          <p>
            <span className="font-semibold">Age:</span> {valueOrDash(prescription.age)}
          </p>
          <p>
            <span className="font-semibold">Gender:</span> {valueOrDash(prescription.gender)}
          </p>
          <p>
            <span className="font-semibold">Phone:</span> {valueOrDash(prescription.phone)}
          </p>
          <p>
            <span className="font-semibold">Address:</span> {valueOrDash(prescription.address)}
          </p>
        </section>

        <main className="mt-5 grid grid-cols-[34%_1fr] gap-6">
          <aside className="space-y-4 border-r border-neutral-300 pr-4 text-sm">
            {sections
              .filter(
                (section) => section.sectionType !== 'Advice' && section.sectionType !== 'Follow Up'
              )
              .map((section) => (
                <section key={section.id}>
                  <h2 className="text-xs font-bold tracking-[0.18em] uppercase">
                    {SECTION_LABELS[section.sectionType]}
                  </h2>
                  <SectionLines sectionId={section.id} content={section.content} />
                </section>
              ))}
          </aside>

          <section>
            <h2 className="text-4xl font-light">Rx</h2>
            <table className="mt-3 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-400 text-left text-xs uppercase tracking-wide">
                  <th className="py-2 pr-3">Medicine</th>
                  <th className="py-2 pr-3">Dose</th>
                  <th className="py-2 pr-3">Frequency</th>
                  <th className="py-2 pr-3">Duration</th>
                </tr>
              </thead>
              <tbody>
                {prescription.medicines.map((medicine, index) => (
                  <tr key={medicine.id} className="align-top">
                    <td className="py-2 pr-3">
                      <span className="mr-2 font-semibold">{index + 1}.</span>
                      {medicine.medicineName}
                      {medicine.notes && (
                        <p className="ml-6 text-xs italic text-neutral-600">{medicine.notes}</p>
                      )}
                    </td>
                    <td className="py-2 pr-3">{valueOrDash(medicine.dosage)}</td>
                    <td className="py-2 pr-3">{valueOrDash(medicine.frequency)}</td>
                    <td className="py-2 pr-3">{valueOrDash(medicine.duration)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {sections
              .filter(
                (section) => section.sectionType === 'Advice' || section.sectionType === 'Follow Up'
              )
              .map((section) => (
                <section key={section.id} className="mt-6 text-sm">
                  {section.sectionType !== 'Follow Up' && (
                    <h2 className="text-xs font-bold tracking-[0.18em] uppercase">
                      {SECTION_LABELS[section.sectionType]}
                    </h2>
                  )}
                  {section.sectionType === 'Follow Up' ? (
                    <FollowUpLine content={section.content} />
                  ) : (
                    <SectionLines sectionId={section.id} content={section.content} />
                  )}
                </section>
              ))}
          </section>
        </main>

        <footer className="mt-16 flex justify-end">
          <div className="min-w-44 border-t border-neutral-900 pt-2 text-center text-xs">
            Doctor Signature
          </div>
        </footer>
      </article>
    </div>
  )
}
