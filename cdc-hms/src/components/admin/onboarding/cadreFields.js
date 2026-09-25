// The four cadres the wizard can onboard, each with the employment and
// professional fields its legacy create form collected, the endpoint that
// form posted to, and how the wizard's one state object maps onto that
// endpoint's payload.
//
// One table so that adding a field (or a cadre) is one edit here rather than a
// new 300-line form. The option lists are lifted verbatim from
// CreateDoctor / CreateStaff / CreateNurse / CreateLabTech so nothing the
// clinic could pick before is lost. `role` is Users.role — the fixed
// authorization primitive; a preset is a template laid over it, never a new
// role.

export const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Consultant', 'Locum', 'Temporary'];
export const SHIFTS = ['Morning', 'Afternoon', 'Night', 'Rotating'];

const text   = (key, label, extra = {}) => ({ key, label, type: 'text', ...extra });
const select = (key, label, options, extra = {}) => ({ key, label, type: 'select', options, ...extra });
const date   = (key, label, extra = {}) => ({ key, label, type: 'date', ...extra });
const number = (key, label, extra = {}) => ({ key, label, type: 'number', ...extra });

const COMMON_EMPLOYMENT = [
  select('employmentType', 'Employment type', EMPLOYMENT_TYPES, { required: true }),
  date('startDate', 'Start date'),
];

export const CADRES = [
  {
    role: 'doctor',
    label: 'Doctor',
    noun: 'doctor',
    endpoint: '/users/doctors',
    fields: [
      text('licenseNumber', 'Licence number', { required: true }),
      select('specialty', 'Specialty', ['Endocrinologist', 'Cardiologist', 'Diabetologist', 'General Practitioner', 'Nephrologist', 'Neurologist', 'Pediatrician', 'Surgeon'], { required: true }),
      text('subSpecialty', 'Sub-specialty'),
      select('department', 'Department', ['Diabetes Care', 'Cardiology', 'Nephrology', 'General Medicine', 'Pediatrics', 'Surgery'], { required: true }),
      text('qualification', 'Qualification', { required: true, placeholder: 'MBChB, MMed…' }),
      text('medicalSchool', 'Medical school'),
      number('yearsExperience', 'Years of experience', { required: true }),
      ...COMMON_EMPLOYMENT,
    ],
    payload: (d) => ({
      licenseNumber: d.licenseNumber,
      specialty: d.specialty,
      subSpecialty: d.subSpecialty || null,
      department: d.department,
      qualification: d.qualification,
      medicalSchool: d.medicalSchool || null,
      yearsExperience: d.yearsExperience ? parseInt(d.yearsExperience, 10) : 0,
      employmentType: d.employmentType,
      startDate: d.startDate || null,
    }),
  },
  {
    role: 'nurse',
    label: 'Nurse',
    noun: 'nurse',
    endpoint: '/users/nurses',
    fields: [
      select('department', 'Department', ['Inpatient Ward', 'HDU', 'Outpatient', 'Triage', 'Theatre', 'Maternity'], { required: true }),
      select('shift', 'Shift', SHIFTS),
      text('licenseNumber', 'Council registration number'),
      text('qualification', 'Qualification'),
      number('yearsExperience', 'Years of experience'),
      ...COMMON_EMPLOYMENT,
    ],
    payload: (d) => ({
      position: d.position || 'Nurse',
      department: d.department,
      shift: d.shift || undefined,
      licenseNumber: d.licenseNumber || undefined,
      qualification: d.qualification || undefined,
      yearsExperience: d.yearsExperience ? parseInt(d.yearsExperience, 10) : undefined,
      employmentType: d.employmentType || undefined,
      startDate: d.startDate || null,
    }),
  },
  {
    role: 'lab',
    label: 'Lab technician',
    noun: 'lab technician',
    endpoint: '/users/lab-techs',
    fields: [
      select('specialization', 'Specialisation', ['Clinical Chemistry', 'Hematology', 'Microbiology', 'Immunology', 'Blood Bank', 'Molecular Diagnostics', 'General Laboratory'], { required: true }),
      text('certificationNumber', 'Certification number', { required: true }),
      select('qualification', 'Qualification', ['Diploma in Medical Laboratory Technology', 'BSc in Medical Laboratory Science', 'Higher Diploma in Medical Laboratory Technology', 'MSc in Medical Laboratory Science', 'Certificate in Laboratory Technology'], { required: true }),
      text('institution', 'Institution'),
      number('yearsExperience', 'Years of experience', { required: true }),
      select('shift', 'Shift', SHIFTS),
      ...COMMON_EMPLOYMENT,
    ],
    payload: (d) => ({
      specialization: d.specialization,
      certificationNumber: d.certificationNumber,
      qualification: d.qualification,
      institution: d.institution || null,
      yearsExperience: d.yearsExperience ? parseInt(d.yearsExperience, 10) : 0,
      shift: d.shift || undefined,
      employmentType: d.employmentType || undefined,
      startDate: d.startDate || null,
    }),
  },
  {
    role: 'staff',
    label: 'Front desk / support staff',
    noun: 'staff member',
    endpoint: '/users/staff',
    fields: [
      // The legacy form called this "Staff Role"; it is the HR job title
      // (StaffProfile.position), never Users.role. Free text now — the fixed
      // list (Nurse / Admin / Receptionist) was wrong twice over: nurses have
      // their own cadre, and "Admin" is a toggle on the next step.
      text('position', 'Job title', { required: true, placeholder: 'Receptionist, Pharmacy assistant…' }),
      select('department', 'Department', ['Front Desk', 'Administration', 'Pharmacy', 'Nursing', 'Records', 'Finance'], { required: true }),
      select('shift', 'Shift', SHIFTS),
      ...COMMON_EMPLOYMENT,
    ],
    payload: (d) => ({
      position: d.position,
      department: d.department,
      shift: d.shift || undefined,
      employmentType: d.employmentType || undefined,
      startDate: d.startDate || null,
    }),
  },
];

export const cadreFor = (role) => CADRES.find((c) => c.role === role) || null;

// Identity + contact fields every cadre sends, mapped the way CreateStaff
// (the most complete legacy form) did — the consolidated StaffProfile has a
// column for each.
export const identityPayload = (d) => ({
  firstName: d.firstName,
  lastName: d.lastName,
  email: d.email,
  phone: d.phone,
  dateOfBirth: d.dateOfBirth || null,
  gender: d.gender || undefined,
  idNumber: d.idNumber || undefined,
  address: d.address || undefined,
  city: d.city || undefined,
  emergencyContact: d.emergencyContact || d.emergencyPhone
    ? { name: d.emergencyContact || null, relationship: d.emergencyRelationship || null, phone: d.emergencyPhone || null }
    : undefined,
  password: d.temporaryPassword || undefined,
});
