// ========================================
// MOCK DATA - Single Source of Truth
// Complete data for all 5 portals
// ========================================

// ========================================
// 1. USERS DATA
// ========================================

export const mockUsers = {
  doctors: [
    {
      id: 1,
      name: 'Dr. Ahmed Hassan',
      email: 'ahmed.hassan@cdc.com',
      phone: '+254 720 111 222',
      specialty: 'Endocrinologist',
      subSpecialty: 'Diabetes Management',
      department: 'Diabetes Care',
      licenseNumber: 'MED-KE-12345',
      qualification: 'MD, MRCP',
      medicalSchool: 'University of Nairobi',
      yearsExperience: 15,
      employmentType: 'Full-time',
      startDate: '2010-01-15',
      status: 'Active',
      role: 'Doctor'
    },
    {
      id: 2,
      name: 'Dr. Sarah Kamau',
      email: 'sarah.kamau@cdc.com',
      phone: '+254 720 333 444',
      specialty: 'Cardiologist',
      subSpecialty: 'Interventional Cardiology',
      department: 'Cardiology',
      licenseNumber: 'MED-KE-12346',
      qualification: 'MD, FACC',
      medicalSchool: 'Aga Khan University',
      yearsExperience: 12,
      employmentType: 'Full-time',
      startDate: '2012-03-20',
      status: 'Active',
      role: 'Doctor'
    },
    {
      id: 3,
      name: 'Dr. James Omondi',
      email: 'james.omondi@cdc.com',
      phone: '+254 720 555 666',
      specialty: 'Diabetologist',
      subSpecialty: 'Pediatric Diabetes',
      department: 'Diabetes Care',
      licenseNumber: 'MED-KE-12347',
      qualification: 'MD, MPH',
      medicalSchool: 'Kenyatta University',
      yearsExperience: 10,
      employmentType: 'Full-time',
      startDate: '2014-06-10',
      status: 'Active',
      role: 'Doctor'
    },
    {
      id: 4,
      name: 'Dr. Peter Mwangi',
      email: 'peter.mwangi@cdc.com',
      phone: '+254 720 777 888',
      specialty: 'General Practitioner',
      subSpecialty: 'Family Medicine',
      department: 'General Medicine',
      licenseNumber: 'MED-KE-12348',
      qualification: 'MBBS',
      medicalSchool: 'Moi University',
      yearsExperience: 8,
      employmentType: 'Part-time',
      startDate: '2016-09-01',
      status: 'Active',
      role: 'Doctor'
    },
  ],

  staff: [
    {
      id: 1,
      name: 'Mary Njeri',
      email: 'mary.njeri@cdc.com',
      phone: '+254 712 111 222',
      position: 'Receptionist',
      department: 'Front Desk',
      employmentType: 'Full-time',
      shift: 'Morning',
      startDate: '2019-01-10',
      status: 'Active',
      role: 'Staff'
    },
    {
      id: 2,
      name: 'John Mwangi',
      email: 'john.mwangi@cdc.com',
      phone: '+254 712 333 444',
      position: 'Nurse',
      department: 'Triage',
      employmentType: 'Full-time',
      shift: 'Rotating',
      startDate: '2018-05-15',
      status: 'Active',
      role: 'Staff'
    },
    {
      id: 3,
      name: 'Grace Wambui',
      email: 'grace.wambui@cdc.com',
      phone: '+254 712 555 666',
      position: 'Administrative Assistant',
      department: 'Administration',
      employmentType: 'Full-time',
      shift: 'Morning',
      startDate: '2020-02-01',
      status: 'Inactive',
      role: 'Staff'
    },
  ],

  labTechs: [
    {
      id: 1,
      name: 'Sarah Mwangi',
      email: 'sarah.mwangi@cdc.com',
      phone: '+254 713 111 222',
      specialization: 'Clinical Chemistry',
      certificationNumber: 'MLT-KE-12345',
      qualification: 'BSc Medical Laboratory Science',
      institution: 'JKUAT',
      yearsExperience: 7,
      employmentType: 'Full-time',
      shift: 'Morning',
      startDate: '2017-03-15',
      status: 'Active',
      role: 'Lab'
    },
    {
      id: 2,
      name: 'John Kamau',
      email: 'john.kamau@cdc.com',
      phone: '+254 713 333 444',
      specialization: 'Hematology',
      certificationNumber: 'MLT-KE-12346',
      qualification: 'Diploma in Medical Laboratory Technology',
      institution: 'Kenya Medical Training College',
      yearsExperience: 5,
      employmentType: 'Full-time',
      shift: 'Afternoon',
      startDate: '2019-07-01',
      status: 'Active',
      role: 'Lab'
    },
  ],

  admins: [
    {
      id: 1,
      name: 'Admin User',
      email: 'admin@cdc.com',
      phone: '+254 700 000 000',
      status: 'Active',
      role: 'Admin'
    },
  ],
};

// ========================================
// 2. PATIENTS DATA
// ========================================

export const mockPatients = [
  {
    id: 1,
    uhid: 'CDC001',
    name: 'John Doe',
    age: 45,
    gender: 'Male',
    phone: '0733544253',
    email: 'john.doe@email.com',
    address: 'Kilimani, Nairobi',
    dateOfBirth: '1979-05-15',
    idNumber: '12345678',

    // Medical Info
    diabetesType: 'Type 2',
    diagnosisDate: '2018-03-15',
    hba1c: '7.2%',
    primaryDoctor: 'Dr. Ahmed Hassan',
    referredBy: 'Nairobi Hospital',

    // Status
    status: 'Active',
    riskLevel: 'Medium',
    lastVisit: '2024-12-05',
    nextVisit: '2024-12-20',

    // Emergency Contact
    emergencyContact: {
      name: 'Jane Doe',
      relationship: 'Spouse',
      phone: '0722111222'
    },

    // Insurance
    insurance: {
      provider: 'NHIF',
      policyNumber: 'NHIF-123456',
      type: 'Insurance'
    },

    // Vitals (Latest)
    vitals: {
      bp: '130/85 mmHg',
      heartRate: '75 bpm',
      weight: '82 kg',
      height: '175 cm',
      bmi: '26.8',
      temperature: '36.7°C',
      oxygenSaturation: '98%',
      waistCircumference: '95 cm',
      waistHeightRatio: '0.54',
    },

    // Current Medications
    medications: [
      'Metformin 500mg - Twice daily',
      'Glimepiride 2mg - Once daily',
    ],

    // Allergies
    allergies: 'None',

    // Comorbidities
    comorbidities: ['Hypertension'],

    //  Medical Equipment
    medicalEquipment: {
      insulinPump: {
        hasPump: false,
        current: null,
        transmitter: null,
        history: []
      }
    },
  },

  {
    id: 2,
    uhid: 'CDC002',
    name: 'Jane Smith',
    age: 52,
    gender: 'Female',
    phone: '0722123456',
    email: 'jane.smith@email.com',
    address: 'Westlands, Nairobi',
    dateOfBirth: '1972-08-22',
    idNumber: '23456789',

    diabetesType: 'Type 2',
    diagnosisDate: '2019-06-10',
    hba1c: '6.8%',
    primaryDoctor: 'Dr. Sarah Kamau',
    referredBy: 'Aga Khan Hospital',

    status: 'Active',
    riskLevel: 'Low',
    lastVisit: '2024-12-05',
    nextVisit: '2024-12-18',

    emergencyContact: {
      name: 'John Smith',
      relationship: 'Spouse',
      phone: '0733222333'
    },

    insurance: {
      provider: 'AAR Healthcare',
      policyNumber: 'AAR-789012',
      type: 'Insurance'
    },

    vitals: {
      bp: '125/80 mmHg',
      heartRate: '72 bpm',
      weight: '68 kg',
      height: '162 cm',
      bmi: '25.9',
      temperature: '36.5°C',
      oxygenSaturation: '99%',
      waistCircumference: '95 cm',
      waistHeightRatio: '0.54',
    },

    medications: [
      'Metformin 850mg - Twice daily',
      'Atorvastatin 20mg - Once daily',
    ],

    allergies: 'Penicillin',
    comorbidities: ['Dyslipidemia'],

    // Medical Equipment
    medicalEquipment: {
      insulinPump: {
        hasPump: false,
        current: null,
        transmitter: null,
        history: []
      }
    },
  },

  {
    id: 3,
    uhid: 'CDC003',
    name: 'Ali Hassan',
    age: 38,
    gender: 'Male',
    phone: '0711987654',
    email: 'ali.hassan@email.com',
    address: 'Mombasa, Kenya',
    dateOfBirth: '1986-03-10',
    idNumber: '34567890',

    diabetesType: 'Type 1',
    diagnosisDate: '2015-01-20',
    hba1c: '8.5%',
    primaryDoctor: 'Dr. James Omondi',
    referredBy: 'Coast General Hospital',

    status: 'Active',
    riskLevel: 'High',
    lastVisit: '2024-12-05',
    nextVisit: '2024-12-15',

    emergencyContact: {
      name: 'Fatima Hassan',
      relationship: 'Sister',
      phone: '0744333444'
    },

    insurance: {
      provider: 'Jubilee Insurance',
      policyNumber: 'JUB-345678',
      type: 'Insurance'
    },

    vitals: {
      bp: '140/90 mmHg',
      heartRate: '80 bpm',
      weight: '75 kg',
      height: '178 cm',
      bmi: '23.7',
      temperature: '36.8°C',
      oxygenSaturation: '97%',
      waistCircumference: '95 cm',
      waistHeightRatio: '0.54',
    },

    medications: [
      'Insulin Aspart 10 units - Before meals',
      'Insulin Glargine 20 units - Bedtime',
    ],

    allergies: 'None',
    comorbidities: [],


    //  Medical Equipment (WITH TEST DATA - Type 1 Diabetes patient)
    medicalEquipment: {
      insulinPump: {
        hasPump: true,
        current: {
          type: 'new',
          serialNo: 'INS-2024-001',
          model: 'MiniMed 780G',
          manufacturer: 'Medtronic',
          startDate: '2024-01-15',
          warrantyStartDate: '2024-01-15',
          warrantyEndDate: '2028-01-15',
          addedBy: 'Mary Njeri (Staff)',
          addedDate: '2024-01-15T10:30:00Z',
          lastUpdatedBy: 'Mary Njeri (Staff)',
          lastUpdatedDate: '2024-01-15T10:30:00Z'
        },
        transmitter: {
          hasTransmitter: true,
          type: 'new',
          serialNo: 'TRX-2024-050',
          startDate: '2024-01-15',
          warrantyStartDate: '2024-01-15',
          warrantyEndDate: '2025-01-15',
          addedBy: 'Mary Njeri (Staff)',
          addedDate: '2024-01-15T10:30:00Z',
          lastUpdatedBy: 'Mary Njeri (Staff)',
          lastUpdatedDate: '2024-01-15T10:30:00Z'
        },
        history: []
      }
    },
  },

  {
    id: 4,
    uhid: 'CDC005',
    name: 'Mary Johnson',
    age: 61,
    gender: 'Female',
    phone: '0722334455',
    email: 'mary.johnson@email.com',
    address: 'Karen, Nairobi',
    dateOfBirth: '1963-11-05',
    idNumber: '45678901',

    diabetesType: 'Type 2',
    diagnosisDate: '2018-03-15',
    hba1c: '7.9%',
    primaryDoctor: 'Dr. Ahmed Hassan',
    referredBy: 'MP Shah Hospital',

    status: 'Active',
    riskLevel: 'Medium',
    lastVisit: '2024-11-28',
    nextVisit: '2024-12-28',

    emergencyContact: {
      name: 'Peter Johnson',
      relationship: 'Son',
      phone: '0755444555'
    },

    insurance: {
      provider: 'NHIF',
      policyNumber: 'NHIF-456789',
      type: 'Insurance'
    },

    vitals: {
      bp: '135/85 mmHg',
      heartRate: '78 bpm',
      weight: '78 kg',
      height: '165 cm',
      bmi: '28.7',
      temperature: '36.6°C',
      oxygenSaturation: '98%',
      waistCircumference: '95 cm',
      waistHeightRatio: '0.54',
    },

    medications: [
      'Metformin 500mg - Twice daily',
      'Glimepiride 2mg - Once daily',
      'Atorvastatin 20mg - Once daily'
    ],

    allergies: 'Sulfa drugs',
    comorbidities: ['Hypertension', 'Dyslipidemia'],

    // NEW: Medical Equipment
    medicalEquipment: {
      insulinPump: {
        hasPump: false,
        current: null,
        transmitter: null,
        history: []
      }
    },
  },

  {
    id: 5,
    uhid: 'CDC007',
    name: 'Grace Wanjiru',
    age: 47,
    gender: 'Female',
    phone: '0711223344',
    email: 'grace.wanjiru@email.com',
    address: 'Thika, Kenya',
    dateOfBirth: '1977-07-12',
    idNumber: '56789012',

    diabetesType: 'Type 2',
    diagnosisDate: '2020-06-10',
    hba1c: '9.1%',
    primaryDoctor: 'Dr. Ahmed Hassan',
    referredBy: 'Kenyatta Hospital',

    status: 'Active',
    riskLevel: 'High',
    lastVisit: '2024-12-01',
    nextVisit: '2024-12-22',

    emergencyContact: {
      name: 'Joseph Wanjiru',
      relationship: 'Husband',
      phone: '0766555666'
    },

    insurance: {
      provider: 'CIC Insurance',
      policyNumber: 'CIC-567890',
      type: 'Insurance'
    },

    vitals: {
      bp: '145/92 mmHg',
      heartRate: '82 bpm',
      weight: '85 kg',
      height: '160 cm',
      bmi: '33.2',
      temperature: '36.9°C',
      oxygenSaturation: '96%',
      waistCircumference: '95 cm',
      waistHeightRatio: '0.54',
    },

    medications: [
      'Metformin 1000mg - Twice daily',
      'Insulin Glargine 20 units - Bedtime',
      'Amlodipine 5mg - Once daily'
    ],

    allergies: 'None',
    comorbidities: ['Hypertension', 'Obesity'],
    // Medical Equipment
    medicalEquipment: {
      insulinPump: {
        hasPump: false,
        current: null,
        transmitter: null,
        history: []
      }
    },
  },
];

// ========================================
// 3. PRESCRIPTIONS DATA
// ========================================

export const mockPrescriptions = [
  {
    id: 1,
    prescriptionNumber: 'RX-2024-001',
    uhid: 'CDC001',
    patientName: 'John Doe',
    doctorName: 'Dr. Ahmed Hassan',
    doctorSpecialty: 'Endocrinologist',
    date: '2024-12-05',
    diagnosis: 'Type 2 Diabetes Mellitus - Controlled',
    status: 'Active',
    medications: [
      {
        name: 'Metformin',
        genericName: 'Metformin HCl',
        dosage: '500mg',
        frequency: 'Twice daily',
        duration: '30 days',
        quantity: 60,
        instructions: 'Take with meals',
        refills: 2
      },
      {
        name: 'Glimepiride',
        genericName: 'Glimepiride',
        dosage: '2mg',
        frequency: 'Once daily',
        duration: '30 days',
        quantity: 30,
        instructions: 'Take before breakfast',
        refills: 2
      },
    ],
    notes: 'Monitor blood sugar levels regularly. Follow up in 3 months.',
  },

  {
    id: 2,
    prescriptionNumber: 'RX-2024-002',
    uhid: 'CDC002',
    patientName: 'Jane Smith',
    doctorName: 'Dr. Sarah Kamau',
    doctorSpecialty: 'Cardiologist',
    date: '2024-12-05',
    diagnosis: 'Type 2 Diabetes with Dyslipidemia',
    status: 'Active',
    medications: [
      {
        name: 'Metformin',
        genericName: 'Metformin HCl',
        dosage: '850mg',
        frequency: 'Twice daily',
        duration: '30 days',
        quantity: 60,
        instructions: 'Take with meals',
        refills: 3
      },
      {
        name: 'Atorvastatin',
        genericName: 'Atorvastatin Calcium',
        dosage: '20mg',
        frequency: 'Once daily',
        duration: '30 days',
        quantity: 30,
        instructions: 'Take at bedtime',
        refills: 3
      },
    ],
    notes: 'Check lipid profile in 6 weeks.',
  },

  {
    id: 3,
    prescriptionNumber: 'RX-2024-003',
    uhid: 'CDC003',
    patientName: 'Ali Hassan',
    doctorName: 'Dr. James Omondi',
    doctorSpecialty: 'Diabetologist',
    date: '2024-12-05',
    diagnosis: 'Type 1 Diabetes Mellitus',
    status: 'Active',
    medications: [
      {
        name: 'Insulin Aspart',
        genericName: 'Insulin Aspart',
        dosage: '10 units',
        frequency: 'Before meals',
        duration: '30 days',
        quantity: '3 vials',
        instructions: 'Inject 15 minutes before meals',
        refills: 1
      },
      {
        name: 'Insulin Glargine',
        genericName: 'Insulin Glargine',
        dosage: '20 units',
        frequency: 'Bedtime',
        duration: '30 days',
        quantity: '2 vials',
        instructions: 'Inject same time every night',
        refills: 1
      },
    ],
    notes: 'Maintain carbohydrate counting. Regular blood glucose monitoring essential.',
  },

  {
    id: 4,
    prescriptionNumber: 'RX-2024-004',
    uhid: 'CDC005',
    patientName: 'Mary Johnson',
    doctorName: 'Dr. Ahmed Hassan',
    doctorSpecialty: 'Endocrinologist',
    date: '2024-11-28',
    diagnosis: 'Type 2 Diabetes Mellitus with Hypertension',
    status: 'Active',
    medications: [
      {
        name: 'Metformin',
        genericName: 'Metformin HCl',
        dosage: '500mg',
        frequency: 'Twice daily',
        duration: '30 days',
        quantity: 60,
        instructions: 'Take with meals',
        refills: 2
      },
      {
        name: 'Glimepiride',
        genericName: 'Glimepiride',
        dosage: '2mg',
        frequency: 'Once daily',
        duration: '30 days',
        quantity: 30,
        instructions: 'Take before breakfast',
        refills: 2
      },
      {
        name: 'Atorvastatin',
        genericName: 'Atorvastatin Calcium',
        dosage: '20mg',
        frequency: 'Once daily',
        duration: '30 days',
        quantity: 30,
        instructions: 'Take at bedtime',
        refills: 2
      },
    ],
    notes: 'Patient compliant with medications. HbA1c improving. Continue current regimen.',
  },

  {
    id: 5,
    prescriptionNumber: 'RX-2024-005',
    uhid: 'CDC007',
    patientName: 'Grace Wanjiru',
    doctorName: 'Dr. Ahmed Hassan',
    doctorSpecialty: 'Endocrinologist',
    date: '2024-12-01',
    diagnosis: 'Type 2 Diabetes Mellitus - Poorly Controlled',
    status: 'Active',
    medications: [
      {
        name: 'Metformin',
        genericName: 'Metformin HCl',
        dosage: '1000mg',
        frequency: 'Twice daily',
        duration: '30 days',
        quantity: 60,
        instructions: 'Take with meals',
        refills: 1
      },
      {
        name: 'Insulin Glargine',
        genericName: 'Insulin Glargine',
        dosage: '20 units',
        frequency: 'Bedtime',
        duration: '30 days',
        quantity: '2 vials',
        instructions: 'Inject same time every night',
        refills: 1
      },
      {
        name: 'Amlodipine',
        genericName: 'Amlodipine Besylate',
        dosage: '5mg',
        frequency: 'Once daily',
        duration: '30 days',
        quantity: 30,
        instructions: 'Take in the morning',
        refills: 1
      },
    ],
    notes: 'Started insulin therapy. Counsel on insulin administration and storage. Follow up in 2 weeks.',
  },
];

// ========================================
// 4. BLOOD SUGAR READINGS
// ========================================

export const mockBloodSugarReadings = {
  'CDC001': [
    { date: '2024-12-11', timeSlot: 'fasting', value: 142, time: '07:00 AM' },
    { date: '2024-12-11', timeSlot: 'breakfast', value: 165, time: '09:30 AM' },
    { date: '2024-12-11', timeSlot: 'beforeLunch', value: 138, time: '12:30 PM' },
    { date: '2024-12-11', timeSlot: 'afterLunch', value: 178, time: '02:30 PM' },
    { date: '2024-12-11', timeSlot: 'beforeDinner', value: 145, time: '06:30 PM' },
    { date: '2024-12-11', timeSlot: 'afterDinner', value: 172, time: '08:30 PM' },
    { date: '2024-12-11', timeSlot: 'bedtime', value: 135, time: '10:00 PM' },

    { date: '2024-12-10', timeSlot: 'fasting', value: 138, time: '07:00 AM' },
    { date: '2024-12-10', timeSlot: 'breakfast', value: 162, time: '09:30 AM' },
    { date: '2024-12-10', timeSlot: 'beforeLunch', value: 135, time: '12:30 PM' },
    { date: '2024-12-10', timeSlot: 'afterLunch', value: 175, time: '02:30 PM' },
    { date: '2024-12-10', timeSlot: 'beforeDinner', value: 142, time: '06:30 PM' },
    { date: '2024-12-10', timeSlot: 'afterDinner', value: 168, time: '08:30 PM' },
    { date: '2024-12-10', timeSlot: 'bedtime', value: 132, time: '10:00 PM' },

    { date: '2024-12-09', timeSlot: 'fasting', value: 145, time: '07:00 AM' },
    { date: '2024-12-09', timeSlot: 'breakfast', value: 170, time: '09:30 AM' },
    { date: '2024-12-09', timeSlot: 'beforeLunch', value: 140, time: '12:30 PM' },
    { date: '2024-12-09', timeSlot: 'afterLunch', value: 182, time: '02:30 PM' },
    { date: '2024-12-09', timeSlot: 'beforeDinner', value: 148, time: '06:30 PM' },
    { date: '2024-12-09', timeSlot: 'afterDinner', value: 175, time: '08:30 PM' },
    { date: '2024-12-09', timeSlot: 'bedtime', value: 138, time: '10:00 PM' },
  ],

  'CDC002': [
    { date: '2024-12-11', timeSlot: 'fasting', value: 128, time: '07:00 AM' },
    { date: '2024-12-11', timeSlot: 'breakfast', value: 148, time: '09:30 AM' },
    { date: '2024-12-11', timeSlot: 'beforeLunch', value: 125, time: '12:30 PM' },
    { date: '2024-12-11', timeSlot: 'afterLunch', value: 155, time: '02:30 PM' },
    { date: '2024-12-11', timeSlot: 'beforeDinner', value: 132, time: '06:30 PM' },
    { date: '2024-12-11', timeSlot: 'afterDinner', value: 158, time: '08:30 PM' },
    { date: '2024-12-11', timeSlot: 'bedtime', value: 122, time: '10:00 PM' },
  ],

  'CDC003': [
    { date: '2024-12-11', timeSlot: 'fasting', value: 165, time: '07:00 AM' },
    { date: '2024-12-11', timeSlot: 'breakfast', value: 210, time: '09:30 AM' },
    { date: '2024-12-11', timeSlot: 'beforeLunch', value: 158, time: '12:30 PM' },
    { date: '2024-12-11', timeSlot: 'afterLunch', value: 215, time: '02:30 PM' },
    { date: '2024-12-11', timeSlot: 'beforeDinner', value: 172, time: '06:30 PM' },
    { date: '2024-12-11', timeSlot: 'afterDinner', value: 205, time: '08:30 PM' },
    { date: '2024-12-11', timeSlot: 'bedtime', value: 162, time: '10:00 PM' },
  ],

  'CDC005': [
    { date: '2024-12-11', timeSlot: 'fasting', value: 152, time: '07:00 AM' },
    { date: '2024-12-11', timeSlot: 'breakfast', value: 180, time: '09:30 AM' },
    { date: '2024-12-11', timeSlot: 'beforeLunch', value: 148, time: '12:30 PM' },
    { date: '2024-12-11', timeSlot: 'afterLunch', value: 195, time: '02:30 PM' },
    { date: '2024-12-11', timeSlot: 'beforeDinner', value: 155, time: '06:30 PM' },
    { date: '2024-12-11', timeSlot: 'afterDinner', value: 188, time: '08:30 PM' },
    { date: '2024-12-11', timeSlot: 'bedtime', value: 145, time: '10:00 PM' },

    { date: '2024-12-10', timeSlot: 'fasting', value: 148, time: '07:00 AM' },
    { date: '2024-12-10', timeSlot: 'breakfast', value: 178, time: '09:30 AM' },
    { date: '2024-12-10', timeSlot: 'beforeLunch', value: 145, time: '12:30 PM' },
    { date: '2024-12-10', timeSlot: 'afterLunch', value: 192, time: '02:30 PM' },
    { date: '2024-12-10', timeSlot: 'beforeDinner', value: 152, time: '06:30 PM' },
    { date: '2024-12-10', timeSlot: 'afterDinner', value: 185, time: '08:30 PM' },
    { date: '2024-12-10', timeSlot: 'bedtime', value: 142, time: '10:00 PM' },
  ],

  'CDC007': [
    { date: '2024-12-11', timeSlot: 'fasting', value: 178, time: '07:00 AM' },
    { date: '2024-12-11', timeSlot: 'breakfast', value: 225, time: '09:30 AM' },
    { date: '2024-12-11', timeSlot: 'beforeLunch', value: 172, time: '12:30 PM' },
    { date: '2024-12-11', timeSlot: 'afterLunch', value: 230, time: '02:30 PM' },
    { date: '2024-12-11', timeSlot: 'beforeDinner', value: 185, time: '06:30 PM' },
    { date: '2024-12-11', timeSlot: 'afterDinner', value: 220, time: '08:30 PM' },
    { date: '2024-12-11', timeSlot: 'bedtime', value: 175, time: '10:00 PM' },

    { date: '2024-12-10', timeSlot: 'fasting', value: 182, time: '07:00 AM' },
    { date: '2024-12-10', timeSlot: 'breakfast', value: 232, time: '09:30 AM' },
    { date: '2024-12-10', timeSlot: 'beforeLunch', value: 178, time: '12:30 PM' },
    { date: '2024-12-10', timeSlot: 'afterLunch', value: 235, time: '02:30 PM' },
    { date: '2024-12-10', timeSlot: 'beforeDinner', value: 188, time: '06:30 PM' },
    { date: '2024-12-10', timeSlot: 'afterDinner', value: 228, time: '08:30 PM' },
    { date: '2024-12-10', timeSlot: 'bedtime', value: 180, time: '10:00 PM' },
  ],
};

// ========================================
// 5. LAB TESTS & RESULTS
// ========================================

export const mockLabTests = [
  {
    id: 1,
    testNumber: 'LAB-2024-001',
    uhid: 'CDC001',
    patientName: 'John Doe',
    testType: 'HbA1c',
    orderedBy: 'Dr. Ahmed Hassan',
    orderedDate: '2024-12-01',
    priority: 'Routine',
    status: 'Completed',
    results: {
      value: '7.2%',
      normalRange: '< 5.7%',
      interpretation: 'Elevated - Diabetes',
      resultDate: '2024-12-03',
      performedBy: 'Sarah Mwangi'
    }
  },

  {
    id: 2,
    testNumber: 'LAB-2024-002',
    uhid: 'CDC001',
    patientName: 'John Doe',
    testType: 'Lipid Profile',
    orderedBy: 'Dr. Ahmed Hassan',
    orderedDate: '2024-12-01',
    priority: 'Routine',
    status: 'Completed',
    results: {
      totalCholesterol: '210 mg/dL',
      ldl: '135 mg/dL',
      hdl: '45 mg/dL',
      triglycerides: '150 mg/dL',
      interpretation: 'Borderline High',
      resultDate: '2024-12-03',
      performedBy: 'Sarah Mwangi'
    }
  },

  {
    id: 3,
    testNumber: 'LAB-2024-003',
    uhid: 'CDC005',
    patientName: 'Mary Johnson',
    testType: 'Fasting Blood Sugar',
    orderedBy: 'Dr. Ahmed Hassan',
    orderedDate: '2024-12-10',
    priority: 'Urgent',
    status: 'Pending',
    sampleCollected: true,
    collectionDate: '2024-12-10 08:30 AM'
  },

  {
    id: 4,
    testNumber: 'LAB-2024-004',
    uhid: 'CDC007',
    patientName: 'Grace Wanjiru',
    testType: 'HbA1c',
    orderedBy: 'Dr. Ahmed Hassan',
    orderedDate: '2024-12-09',
    priority: 'Urgent',
    status: 'In Progress',
    sampleCollected: true,
    collectionDate: '2024-12-09 09:00 AM',
    expectedDate: '2024-12-12'
  },

  {
    id: 5,
    testNumber: 'LAB-2024-005',
    uhid: 'CDC003',
    patientName: 'Ali Hassan',
    testType: 'Kidney Function Test',
    orderedBy: 'Dr. James Omondi',
    orderedDate: '2024-12-08',
    priority: 'Routine',
    status: 'Completed',
    results: {
      creatinine: '1.1 mg/dL',
      bun: '18 mg/dL',
      gfr: '85 mL/min',
      interpretation: 'Normal',
      resultDate: '2024-12-10',
      performedBy: 'John Kamau'
    }
  },

  {
    id: 6,
    testNumber: 'LAB-2024-006',
    uhid: 'CDC002',
    patientName: 'Jane Smith',
    testType: 'Complete Blood Count',
    orderedBy: 'Dr. Sarah Kamau',
    orderedDate: '2024-12-11',
    priority: 'Routine',
    status: 'Pending',
    sampleCollected: false
  },
];

// ========================================
// 6. APPOINTMENTS
// ========================================

export const mockAppointments = [
  {
    id: 1,
    appointmentNumber: 'APT-2024-001',
    uhid: 'CDC001',
    patientName: 'John Doe',
    doctorName: 'Dr. Ahmed Hassan',
    specialty: 'Endocrinologist',
    date: '2024-12-20',
    time: '10:00 AM',
    duration: '30 minutes',
    type: 'Follow-up',
    status: 'Scheduled',
    reason: '3-month diabetes review',
    notes: 'Bring recent blood sugar log'
  },

  {
    id: 2,
    appointmentNumber: 'APT-2024-002',
    uhid: 'CDC002',
    patientName: 'Jane Smith',
    doctorName: 'Dr. Sarah Kamau',
    specialty: 'Cardiologist',
    date: '2024-12-18',
    time: '11:30 AM',
    duration: '30 minutes',
    type: 'Follow-up',
    status: 'Scheduled',
    reason: 'Lipid profile review',
    notes: ''
  },

  {
    id: 3,
    appointmentNumber: 'APT-2024-003',
    uhid: 'CDC003',
    patientName: 'Ali Hassan',
    doctorName: 'Dr. James Omondi',
    specialty: 'Diabetologist',
    date: '2024-12-15',
    time: '09:00 AM',
    duration: '45 minutes',
    type: 'Routine Check-up',
    status: 'Scheduled',
    reason: 'Type 1 diabetes management',
    notes: 'Discuss insulin adjustment'
  },

  {
    id: 4,
    appointmentNumber: 'APT-2024-004',
    uhid: 'CDC005',
    patientName: 'Mary Johnson',
    doctorName: 'Dr. Ahmed Hassan',
    specialty: 'Endocrinologist',
    date: '2024-12-05',
    time: '10:30 AM',
    duration: '30 minutes',
    type: 'Follow-up',
    status: 'Completed',
    reason: 'Diabetes review',
    notes: 'Patient responded well to treatment'
  },

  {
    id: 5,
    appointmentNumber: 'APT-2024-005',
    uhid: 'CDC007',
    patientName: 'Grace Wanjiru',
    doctorName: 'Dr. Ahmed Hassan',
    specialty: 'Endocrinologist',
    date: '2024-12-22',
    time: '02:00 PM',
    duration: '30 minutes',
    type: 'Urgent',
    status: 'Scheduled',
    reason: 'Poor glycemic control follow-up',
    notes: 'Review insulin therapy response'
  },
];

// ========================================
// 7. CONSULTATION NOTES
// ========================================

export const mockConsultationNotes = [
  {
    id: 1,
    uhid: 'CDC001',
    patientName: 'John Doe',
    doctorName: 'Dr. Ahmed Hassan',
    date: '2024-12-05',
    chiefComplaint: 'Follow-up consultation, increased thirst',
    vitals: {
      bp: '130/85 mmHg',
      heartRate: '75 bpm',
      weight: '82 kg',
      temperature: '36.7°C',
      oxygenSaturation: '98%',
      waistCircumference: '95 cm',
      waistHeightRatio: '0.54',
    },
    assessment: 'Type 2 Diabetes - adequately controlled. Mild polydipsia noted.',
    plan: 'Continue current medications. Increase water intake. Review in 3 months.',
    prescriptions: ['RX-2024-001']
  },

  {
    id: 2,
    uhid: 'CDC005',
    patientName: 'Mary Johnson',
    doctorName: 'Dr. Ahmed Hassan',
    date: '2024-11-28',
    chiefComplaint: 'Routine diabetes check-up',
    vitals: {
      bp: '135/85 mmHg',
      heartRate: '78 bpm',
      weight: '78 kg',
      temperature: '36.6°C',
      oxygenSaturation: '98%',
      waistCircumference: '95 cm',
      waistHeightRatio: '0.54',
    },
    assessment: 'Type 2 Diabetes with Hypertension - good control. HbA1c improving.',
    plan: 'Continue current regimen. Monitor BP at home. Return in 4 weeks.',
    prescriptions: ['RX-2024-004']
  },

  {
    id: 3,
    uhid: 'CDC007',
    patientName: 'Grace Wanjiru',
    doctorName: 'Dr. Ahmed Hassan',
    date: '2024-12-01',
    chiefComplaint: 'Uncontrolled blood sugars, numbness in feet',
    vitals: {
      bp: '145/92 mmHg',
      heartRate: '82 bpm',
      weight: '85 kg',
      temperature: '36.9°C',
      oxygenSaturation: '96%',
      waistCircumference: '95 cm',
      waistHeightRatio: '0.54',
    },
    assessment: 'Type 2 Diabetes - poorly controlled. Peripheral neuropathy symptoms. Hypertension.',
    plan: 'Started insulin therapy. Counsel on administration. Foot care education. Follow up in 2 weeks.',
    prescriptions: ['RX-2024-005']
  },
];

// ========================================
// 8. QUEUE DATA (Daily Operations)
// ========================================

export const mockQueue = [
  {
    id: 1,
    uhid: 'CDC001',
    name: 'John Doe',
    arrivalTime: '09:00 AM',
    priority: 'Normal',
    status: 'Waiting',
    estimatedWait: '15 min',
    queueNumber: 1
  },
  {
    id: 2,
    uhid: 'CDC005',
    name: 'Mary Johnson',
    arrivalTime: '09:15 AM',
    priority: 'Urgent',
    status: 'In Triage',
    estimatedWait: '5 min',
    queueNumber: 2
  },
  {
    id: 3,
    uhid: 'CDC007',
    name: 'Grace Wanjiru',
    arrivalTime: '09:30 AM',
    priority: 'Normal',
    status: 'Waiting',
    estimatedWait: '25 min',
    queueNumber: 3
  },
  {
    id: 4,
    uhid: 'CDC002',
    name: 'Jane Smith',
    arrivalTime: '09:45 AM',
    priority: 'Normal',
    status: 'Waiting',
    estimatedWait: '35 min',
    queueNumber: 4
  },
];

// ========================================
// 9. REPORTS & ANALYTICS
// ========================================

export const mockReports = [
  {
    id: 1,
    reportNumber: 'RPT-2024-001',
    title: 'Monthly Patient Summary - November 2024',
    type: 'Patient Summary',
    generatedBy: 'Dr. Ahmed Hassan',
    generatedDate: '2024-12-01',
    period: 'November 2024',
    patients: 45,
    status: 'Generated',
    size: '2.3 MB',
    description: 'Comprehensive patient summary including demographics, visit frequency, and outcomes'
  },

  {
    id: 2,
    reportNumber: 'RPT-2024-002',
    title: 'Glycemic Control Report - Q4 2024',
    type: 'Glycemic Analysis',
    generatedBy: 'Dr. Ahmed Hassan',
    generatedDate: '2024-11-28',
    period: 'Q4 2024',
    patients: 87,
    status: 'Generated',
    size: '4.1 MB',
    description: 'Analysis of HbA1c trends and blood sugar control across patient population'
  },

  {
    id: 3,
    reportNumber: 'RPT-2024-003',
    title: 'Medication Adherence Report - November 2024',
    type: 'Medication Report',
    generatedBy: 'Dr. Sarah Kamau',
    generatedDate: '2024-11-25',
    period: 'November 2024',
    patients: 52,
    status: 'Generated',
    size: '1.8 MB',
    description: 'Prescription compliance and medication adherence analysis'
  },

  {
    id: 4,
    reportNumber: 'RPT-2024-004',
    title: 'High-Risk Patients Report',
    type: 'Risk Assessment',
    generatedBy: 'Dr. James Omondi',
    generatedDate: '2024-11-20',
    period: 'Current',
    patients: 12,
    status: 'Generated',
    size: '890 KB',
    description: 'Identification and monitoring plan for high-risk diabetic patients'
  },
];

// ========================================
// 10. UPLOADED DOCUMENTS (Patient Portal)
// ========================================

export const mockUploadedDocuments = {
  'CDC001': [
    {
      id: 1,
      fileName: 'External_Lab_Results_Nov2024.pdf',
      fileType: 'Lab Result',
      uploadDate: '2024-11-15',
      size: '1.2 MB',
      status: 'Reviewed',
      reviewedBy: 'Dr. Ahmed Hassan',
      reviewDate: '2024-11-16',
      notes: 'Results reviewed and filed'
    },
    {
      id: 2,
      fileName: 'Medical_Certificate.pdf',
      fileType: 'Medical Certificate',
      uploadDate: '2024-10-20',
      size: '450 KB',
      status: 'Reviewed',
      reviewedBy: 'Dr. Ahmed Hassan',
      reviewDate: '2024-10-21',
      notes: ''
    },
  ],

  'CDC005': [
    {
      id: 3,
      fileName: 'Specialist_Report.pdf',
      fileType: 'Specialist Report',
      uploadDate: '2024-11-28',
      size: '2.1 MB',
      status: 'Pending Review',
      reviewedBy: null,
      reviewDate: null,
      notes: ''
    },
  ],
};