import { sql } from 'drizzle-orm'
import { getDb } from './client'
import {
  patients,
  prescriptionSections,
  prescriptionMedicines,
  prescriptions
} from './schema'

const bangladeshiPatients = [
  { name: 'Rahim Uddin', age: '45', gender: 'Male', phone: '01711234567', address: 'Dhanmondi, Dhaka' },
  { name: 'Fatima Begum', age: '32', gender: 'Female', phone: '01812345678', address: 'Banani, Dhaka' },
  { name: 'Kamal Hossain', age: '58', gender: 'Male', phone: '01913456789', address: 'Agrabad, Chittagong' },
  { name: 'Nusrat Jahan', age: '27', gender: 'Female', phone: '01614567890', address: 'Zindabazar, Sylhet' },
  { name: 'Abdul Karim', age: '63', gender: 'Male', phone: '01715678901', address: 'Rajshahi Sadar' },
  { name: 'Shirin Akter', age: '41', gender: 'Female', phone: '01816789012', address: 'Khulna City' },
  { name: 'Mohammad Ali', age: '35', gender: 'Male', phone: '01917890123', address: 'Gulshan, Dhaka' },
  { name: 'Roksana Parveen', age: '29', gender: 'Female', phone: '01618901234', address: 'Bogra Sadar' },
  { name: 'Abul Bashar', age: '52', gender: 'Male', phone: '01719012345', address: 'Comilla City' },
  { name: 'Salma Khatun', age: '38', gender: 'Female', phone: '01810123456', address: 'Mymensingh Sadar' },
  { name: 'Jamal Uddin', age: '47', gender: 'Male', phone: '01911234567', address: 'Rangpur City' },
  { name: 'Rahima Begum', age: '55', gender: 'Female', phone: '01612345678', address: 'Barisal Sadar' },
  { name: 'Habib Rahman', age: '31', gender: 'Male', phone: '01713456789', address: 'Uttara, Dhaka' },
  { name: 'Aklima Khatun', age: '24', gender: 'Female', phone: '01814567890', address: 'Cox\'s Bazar' },
  { name: 'Sharif Uddin', age: '60', gender: 'Male', phone: '01915678901', address: 'Jessore Sadar' },
  { name: 'Nasrin Akhter', age: '36', gender: 'Female', phone: '01616789012', address: 'Motijheel, Dhaka' },
  { name: 'Aminul Haq', age: '44', gender: 'Male', phone: '01717890123', address: 'Tangail Sadar' },
  { name: 'Jesmin Ara', age: '28', gender: 'Female', phone: '01818901234', address: 'Gazipur City' },
  { name: 'Bashir Ahmed', age: '50', gender: 'Male', phone: '01919012345', address: 'Narayanganj City' },
  { name: 'Ayesha Siddiqua', age: '33', gender: 'Female', phone: '01610123456', address: 'Mirpur, Dhaka' },
  { name: 'Abdur Rahim', age: '42', gender: 'Male', phone: '01711234578', address: 'Feni Sadar' },
  { name: 'Monira Begum', age: '48', gender: 'Female', phone: '01812345689', address: 'Noakhali Sadar' },
  { name: 'Helal Uddin', age: '37', gender: 'Male', phone: '01913456790', address: 'Lakshmipur Sadar' },
  { name: 'Sumaiya Khatun', age: '26', gender: 'Female', phone: '01614567801', address: 'Chittagong Sadar' },
  { name: 'Mizanur Rahman', age: '56', gender: 'Male', phone: '01715678912', address: 'Pabna Sadar' },
  { name: 'Kamrun Nahar', age: '40', gender: 'Female', phone: '01816789023', address: 'Kushtia Sadar' },
  { name: 'Faruk Hossain', age: '34', gender: 'Male', phone: '01917890134', address: 'Dinajpur Sadar' },
  { name: 'Lutfar Rahman', age: '62', gender: 'Male', phone: '01618901245', address: 'Thakurgaon Sadar' },
  { name: 'Hasina Begum', age: '29', gender: 'Female', phone: '01719012356', address: 'Panchagarh Sadar' },
  { name: 'Zahirul Islam', age: '46', gender: 'Male', phone: '01810123467', address: 'Chapainawabganj' },
  { name: 'Ruma Akhter', age: '39', gender: 'Female', phone: '01911234578', address: 'Naogaon Sadar' },
  { name: 'Mosharraf Hossain', age: '53', gender: 'Male', phone: '01612345689', address: 'Joypurhat Sadar' },
  { name: 'Shahanaz Begum', age: '31', gender: 'Female', phone: '01713456790', address: 'Manikganj Sadar' },
  { name: 'Anisur Rahman', age: '43', gender: 'Male', phone: '01814567801', address: 'Madaripur Sadar' },
  { name: 'Tahmina Khatun', age: '25', gender: 'Female', phone: '01915678912', address: 'Shariatpur Sadar' },
  { name: 'Shahidul Islam', age: '57', gender: 'Male', phone: '01616789023', address: 'Gopalganj Sadar' },
  { name: 'Nargis Akter', age: '35', gender: 'Female', phone: '01717890134', address: 'Faridpur Sadar' },
  { name: 'Ali Hossain', age: '49', gender: 'Male', phone: '01818901245', address: 'Brahmanbaria Sadar' },
  { name: 'Beauty Khatun', age: '28', gender: 'Female', phone: '01919012356', address: 'Habiganj Sadar' },
  { name: 'Akhteruzzaman', age: '41', gender: 'Male', phone: '01610123467', address: 'Moulvibazar Sadar' }
]

const complaints = [
  'Fever for 3 days with body ache',
  'Persistent cough for 2 weeks',
  'Headache since morning, severe in nature',
  'Stomach pain after eating, bloating',
  'Chest tightness and shortness of breath',
  'Back pain for 1 month, worsening',
  'Joint pain in both knees',
  'Skin rash with itching on arms',
  'Frequent urination at night',
  'Dizziness and fatigue for 1 week',
  'Sore throat with difficulty swallowing',
  'Abdominal pain, nausea and vomiting',
  'Difficulty sleeping for 2 weeks',
  'Pain in right lower abdomen',
  'Wheezing and cough at night',
  'High blood pressure for 3 months',
  'Weight loss without trying',
  'Blood in stool',
  'Pain when urinating, burning sensation',
  'Swelling in both ankles',
  'Loss of appetite for 2 weeks',
  'Blurred vision in left eye',
  'Toothache on right side',
  'Ear pain with discharge',
  'Numbness in fingers of right hand'
]

const examinations = [
  'Temperature: 101.2°F, pulse: 92/min, BP: 130/85 mmHg',
  'Throat: congested, tonsils enlarged',
  'Lungs: bilateral air entry equal, no crepitations',
  'Abdomen: soft, tender in epigastric region',
  'Heart: S1 S2 normal, no murmurs',
  'Skin: erythematous papular rash on forearms',
  'Eyes: pupils equal, reactive to light',
  'ENT: nose congested, throat red',
  'Musculoskeletal: tenderness over lumbar spine',
  'Neurological: power 5/5 all limbs, reflexes normal',
  'Abdomen: hepatomegaly, liver palpable 2cm below costal margin',
  'Chest: tachycardic, clear lung fields',
  'Skin: pallor noted, no jaundice',
  'Joints: swelling of bilateral knee joints',
  'Thyroid: not enlarged, no nodules'
]

const investigations = [
  'CBC: WBC 12000, Hb 11.2, Platelets 250000',
  'Blood sugar: fasting 110 mg/dL, PP 165 mg/dL',
  'ESR: 45mm/hr, CRP: elevated',
  'LFT: ALT 45, AST 38, ALP 120',
  'Urine: routine normal, no sugar or protein',
  'ECG: normal sinus rhythm',
  'X-ray chest: bilateral clear lung fields',
  'Thyroid profile: TSH 4.2, T3 normal, T4 normal',
  'Lipid profile: TC 240, LDL 160, HDL 38, TG 200',
  'HbA1c: 6.8%',
  'Serum creatinine: 1.1 mg/dL',
  'Dengue NS1: negative, IgM: negative',
  'Blood culture: no growth after 48 hours',
  'Urine culture: E. coli >100,000 CFU/mL',
  'USG abdomen: mild fatty liver'
]

const diagnoses = [
  'Upper respiratory tract infection',
  'Type 2 Diabetes Mellitus',
  'Essential Hypertension',
  'Acute gastroenteritis',
  'Bronchial asthma',
  'Migraine',
  'Peptic ulcer disease',
  'Urinary tract infection',
  'Hypothyroidism',
  'Osteoarthritis',
  'Community acquired pneumonia',
  'Acute sinusitis',
  'GERD',
  'Iron deficiency anemia',
  'Viral fever',
  'Dengue fever',
  'Chronic obstructive pulmonary disease',
  'Hyperlipidemia',
  'Low back pain',
  'Tension headache'
]

const adviceList = [
  'Plenty of fluids, bed rest for 3 days',
  'Avoid spicy and oily food',
  'Walk 30 minutes daily',
  'Take medicine after meals',
  'Drink plenty of water',
  'Follow up after 1 week',
  'Avoid cold drinks and ice cream',
  'Do regular exercise',
  'Reduce salt intake',
  'Monitor blood sugar at home',
  'Follow up after 2 weeks',
  'Avoid heavy lifting for 2 weeks',
  'Use warm compress for pain',
  'Get adequate sleep',
  'Avoid screen time before bed'
]

const followUpList = [
  'After 1 week',
  'After 2 weeks',
  'After 1 month',
  'If symptoms worsen',
  'After 3 days',
  'After 10 days',
  'After 2 months',
  'Next week same time',
  'After completion of course',
  'If no improvement in 3 days'
]

const medicineSets = [
  [
    { name: 'Tab. Paracetamol 500mg', dosage: '500mg', frequency: 'TDS', duration: '5 days', notes: 'After food' },
    { name: 'Tab. Cetirizine 10mg', dosage: '10mg', frequency: 'OD', duration: '5 days', notes: 'At bedtime' },
    { name: 'Syr. Ambroxol', dosage: '10ml', frequency: 'TDS', duration: '5 days', notes: 'After food' }
  ],
  [
    { name: 'Tab. Amoxicillin 500mg', dosage: '500mg', frequency: 'TID', duration: '7 days', notes: 'After food' },
    { name: 'Tab. Omeprazole 20mg', dosage: '20mg', frequency: 'OD', duration: '7 days', notes: 'Before breakfast' },
    { name: 'Tab. Paracetamol 500mg', dosage: '500mg', frequency: 'PRN', duration: 'As needed', notes: 'For fever >100°F' }
  ],
  [
    { name: 'Tab. Metformin 500mg', dosage: '500mg', frequency: 'BID', duration: '30 days', notes: 'After food' },
    { name: 'Tab. Gliclazide 80mg', dosage: '80mg', frequency: 'OD', duration: '30 days', notes: 'Before breakfast' },
    { name: 'Tab. Atorvastatin 20mg', dosage: '20mg', frequency: 'OD', duration: '30 days', notes: 'At bedtime' }
  ],
  [
    { name: 'Tab. Amlodipine 5mg', dosage: '5mg', frequency: 'OD', duration: '30 days', notes: 'Morning' },
    { name: 'Tab. Metoprolol 50mg', dosage: '50mg', frequency: 'OD', duration: '30 days', notes: 'Morning' },
    { name: 'Tab. Aspirin 75mg', dosage: '75mg', frequency: 'OD', duration: '30 days', notes: 'After food' }
  ],
  [
    { name: 'Cap. Omeprazole 20mg', dosage: '20mg', frequency: 'OD', duration: '14 days', notes: 'Before breakfast' },
    { name: 'Tab. Ranitidine 150mg', dosage: '150mg', frequency: 'BID', duration: '14 days', notes: 'Before meals' },
    { name: 'Tab. Domperidone 10mg', dosage: '10mg', frequency: 'TID', duration: '7 days', notes: 'Before food' }
  ],
  [
    { name: 'Tab. Ciprofloxacin 500mg', dosage: '500mg', frequency: 'BID', duration: '7 days', notes: 'After food' },
    { name: 'Tab. Metronidazole 400mg', dosage: '400mg', frequency: 'TID', duration: '5 days', notes: 'After food' },
    { name: 'Syr. ORS', dosage: '200ml', frequency: 'PRN', duration: 'As needed', notes: 'For dehydration' }
  ],
  [
    { name: 'Inhaler. Salbutamol', dosage: '2 puffs', frequency: 'PRN', duration: 'As needed', notes: 'For breathlessness' },
    { name: 'Tab. Montelukast 10mg', dosage: '10mg', frequency: 'OD', duration: '30 days', notes: 'At bedtime' },
    { name: 'Tab. Prednisolone 20mg', dosage: '20mg', frequency: 'OD', duration: '5 days', notes: 'Morning' }
  ],
  [
    { name: 'Tab. Sumatriptan 50mg', dosage: '50mg', frequency: 'PRN', duration: 'As needed', notes: 'For acute migraine' },
    { name: 'Tab. Naproxen 500mg', dosage: '500mg', frequency: 'BID', duration: '5 days', notes: 'After food' },
    { name: 'Tab. Prochlorperazine 5mg', dosage: '5mg', frequency: 'TID', duration: '3 days', notes: 'For nausea' }
  ],
  [
    { name: 'Tab. Levothyroxine 50mcg', dosage: '50mcg', frequency: 'OD', duration: '30 days', notes: 'Empty stomach' },
    { name: 'Tab. Calcium + Vitamin D', dosage: '1 tablet', frequency: 'OD', duration: '30 days', notes: 'After food' },
    { name: 'Cap. Omega-3', dosage: '1 capsule', frequency: 'OD', duration: '30 days', notes: 'After food' }
  ],
  [
    { name: 'Tab. Diclofenac 50mg', dosage: '50mg', frequency: 'BID', duration: '7 days', notes: 'After food' },
    { name: 'Cap. Omeprazole 20mg', dosage: '20mg', frequency: 'OD', duration: '7 days', notes: 'Before breakfast' },
    { name: 'Tab. Glucosamine 1500mg', dosage: '1500mg', frequency: 'OD', duration: '30 days', notes: 'After food' }
  ],
  [
    { name: 'Tab. Pantoprazole 40mg', dosage: '40mg', frequency: 'OD', duration: '14 days', notes: 'Before breakfast' },
    { name: 'Tab. Levofloxacin 500mg', dosage: '500mg', frequency: 'OD', duration: '7 days', notes: 'After food' },
    { name: 'Syr. cough suppressant', dosage: '10ml', frequency: 'TID', duration: '5 days', notes: 'For persistent cough' }
  ],
  [
    { name: 'Cap. Azithromycin 500mg', dosage: '500mg', frequency: 'OD', duration: '5 days', notes: '1 hour before food' },
    { name: 'Tab. Paracetamol 650mg', dosage: '650mg', frequency: 'TDS', duration: '5 days', notes: 'For fever' },
    { name: 'Tab. Cetirizine 10mg', dosage: '10mg', frequency: 'OD', duration: '5 days', notes: 'At bedtime' }
  ],
  [
    { name: 'Tab. Ferrous sulfate 200mg', dosage: '200mg', frequency: 'BID', duration: '30 days', notes: 'With orange juice' },
    { name: 'Tab. Folic acid 5mg', dosage: '5mg', frequency: 'OD', duration: '30 days', notes: 'After food' },
    { name: 'Cap. Vitamin C 500mg', dosage: '500mg', frequency: 'OD', duration: '30 days', notes: 'After food' }
  ],
  [
    { name: 'Tab. Ibuprofen 400mg', dosage: '400mg', frequency: 'TID', duration: '5 days', notes: 'After food' },
    { name: 'Tab. Paracetamol 500mg', dosage: '500mg', frequency: 'PRN', duration: 'As needed', notes: 'For high fever' },
    { name: 'Syr. Antihistamine', dosage: '5ml', frequency: 'TID', duration: '5 days', notes: 'For runny nose' }
  ],
  [
    { name: 'Tab. Bisoprolol 5mg', dosage: '5mg', frequency: 'OD', duration: '30 days', notes: 'Morning' },
    { name: 'Tab. Telmisartan 40mg', dosage: '40mg', frequency: 'OD', duration: '30 days', notes: 'Morning' },
    { name: 'Tab. Aspirin 75mg', dosage: '75mg', frequency: 'OD', duration: '30 days', notes: 'After food' }
  ]
]

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function seedDatabase(): void {
  const db = getDb()
  const existing = db.select({ count: sql<number>`COUNT(*)` }).from(patients).get()
  if (existing && existing.count > 0) return

  db.transaction((tx) => {
    const now = new Date()
    const patientIds: number[] = []

    for (let i = 0; i < bangladeshiPatients.length; i++) {
      const p = bangladeshiPatients[i]
      const patientCode = `PAT-${String(i + 1).padStart(6, '0')}`
      const daysAgo = Math.floor(Math.random() * 180)
      const createdAt = new Date(now.getTime() - daysAgo * 86400000).toISOString().slice(0, 19).replace('T', ' ')
      const result = tx
        .insert(patients)
        .values({
          patientCode,
          name: p.name,
          age: p.age,
          gender: p.gender,
          phone: p.phone,
          address: p.address,
          createdAt,
          updatedAt: createdAt
        })
        .returning({ id: patients.patientId })
        .get()
      patientIds.push(result.id)
    }

    for (let i = 0; i < 50; i++) {
      const patientId = patientIds[i < patientIds.length ? i : i % patientIds.length]
      const visitNo = i < patientIds.length ? 1 : Math.floor(i / patientIds.length) + 1
      const daysAgo = Math.floor(Math.random() * 90)
      const createdAt = new Date(now.getTime() - daysAgo * 86400000).toISOString().slice(0, 19).replace('T', ' ')
      const updatedAt = createdAt

      const prescription = tx
        .insert(prescriptions)
        .values({ patientId, visitNo, createdAt, updatedAt })
        .returning({ id: prescriptions.prescriptionId })
        .get()

      const medicineSet = randomPick(medicineSets)

      tx.insert(prescriptionSections)
        .values([
          {
            prescriptionId: prescription.id,
            sectionType: 'Chief Complaint',
            content: randomPick(complaints),
            position: 0
          },
          {
            prescriptionId: prescription.id,
            sectionType: 'Examination',
            content: randomPick(examinations),
            position: 1
          },
          {
            prescriptionId: prescription.id,
            sectionType: 'Investigations',
            content: randomPick(investigations),
            position: 2
          },
          {
            prescriptionId: prescription.id,
            sectionType: 'Provisional Diagnosis',
            content: randomPick(diagnoses),
            position: 3
          },
          {
            prescriptionId: prescription.id,
            sectionType: 'Advice',
            content: randomPick(adviceList),
            position: 4
          },
          {
            prescriptionId: prescription.id,
            sectionType: 'Follow Up',
            content: randomPick(followUpList),
            position: 5
          }
        ])
        .run()

      tx.insert(prescriptionMedicines)
        .values(
          medicineSet.map((m, idx) => ({
            prescriptionId: prescription.id,
            medicineName: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
            duration: m.duration,
            notes: m.notes,
            position: idx
          }))
        )
        .run()
    }
  })

  console.log('[seed] Database seeded with 40 patients and 50 prescriptions')
}
