import { z } from 'zod'

export const JSON_FORMAT_VERSION = 1

export const JSON_EXPORT_EXAMPLE = JSON.stringify(
  {
    formatVersion: JSON_FORMAT_VERSION,
    exportedAt: '2026-06-12T15:00:00.000Z',
    doctorProfile: {
      name: 'Dr. Jane Doe',
      degrees: 'MBBS, FCPS',
      speciality: 'Cardiology',
      phone: '0123456789',
      email: 'jane@example.com',
      address: '123 Clinic Road',
      chamber: 'City Hospital, Room 4',
      logoPath: '',
      signaturePath: ''
    },
    paperSettings: {
      widthMm: 210,
      heightMm: 297,
      marginTop: 10,
      marginBottom: 10,
      marginLeft: 10,
      marginRight: 10
    },
    patients: [
      {
        patientCode: 'PAT-000001',
        name: 'John Smith',
        age: '42',
        gender: 'Male',
        phone: '0987654321',
        address: '45 Main Street',
        prescriptions: [
          {
            visitNo: 1,
            createdAt: '2026-01-10 09:30:00',
            sections: [
              { sectionType: 'Chief Complaint', content: 'Chest pain', position: 0 },
              { sectionType: 'Provisional Diagnosis', content: 'Angina', position: 3 }
            ],
            medicines: [
              {
                medicineName: 'Aspirin',
                dosage: '75mg',
                frequency: '1+0+0',
                duration: '30 days',
                notes: 'After meal',
                position: 0
              }
            ]
          }
        ]
      }
    ],
    presets: [
      {
        category: 'Medicine',
        title: 'Aspirin 75mg',
        content: 'Aspirin 75mg',
        links: []
      }
    ]
  },
  null,
  2
)

export const doctorProfileFormSchema = z.object({
  name: z.string().trim().max(160).optional().or(z.literal('')),
  degrees: z.string().trim().max(240).optional().or(z.literal('')),
  speciality: z.string().trim().max(160).optional().or(z.literal('')),
  phone: z.string().trim().max(80).optional().or(z.literal('')),
  email: z.string().trim().max(160).optional().or(z.literal('')),
  address: z.string().trim().max(500).optional().or(z.literal('')),
  chamber: z.string().trim().max(500).optional().or(z.literal('')),
  logoPath: z.string().trim().max(1000).optional().or(z.literal('')),
  signaturePath: z.string().trim().max(1000).optional().or(z.literal(''))
})

export const paperSettingsFormSchema = z.object({
  widthMm: z.number().positive().max(1000),
  heightMm: z.number().positive().max(1000),
  marginTop: z.number().min(0).max(100),
  marginBottom: z.number().min(0).max(100),
  marginLeft: z.number().min(0).max(100),
  marginRight: z.number().min(0).max(100)
})

export type DoctorProfileFormValues = z.infer<typeof doctorProfileFormSchema>
export type PaperSettingsFormValues = z.infer<typeof paperSettingsFormSchema>

export interface BackupActionResult {
  ok: boolean
  path?: string
  message?: string
}
