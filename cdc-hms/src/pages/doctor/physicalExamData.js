// Physical Examination Data Structure - COMPLETE VERSION
// Includes: Left/Right feet, 4 lung zones, 4 abdominal quadrants, full cardiovascular


export const physicalExamSections = [
  {
  id: 'vitalSigns',
  icon: '📊',
  title: 'Vital Signs',
  type: 'vitals',
  fields: [
    { id: 'bp', label: 'Blood Pressure', unit: 'mmHg', type: 'text', placeholder: '120/80' },
    { id: 'hr', label: 'Heart Rate', unit: 'bpm', type: 'number', placeholder: '80' },
    { id: 'rr', label: 'Respiratory Rate', unit: '/min', type: 'number', placeholder: '18' },
    { id: 'temp', label: 'Temperature', unit: '°C', type: 'number', placeholder: '36.7', step: '0.1' },
    { id: 'spo2', label: 'SpO2', unit: '%', type: 'number', placeholder: '98' },
    { id: 'bmi', label: 'BMI', unit: 'kg/m²', type: 'number', placeholder: '25.0', step: '0.1' },
    { id: 'waistCircumference', label: 'Waist Circumference', unit: 'cm', type: 'number', placeholder: '90', step: '0.1' },
    { id: 'waistHeightRatio', label: 'Waist-to-Height Ratio', unit: '', type: 'number', placeholder: '0.51', step: '0.01' },
    { id: 'rbs', label: 'RBS', unit: 'mmol/L', type: 'number', placeholder: '5.5', step: '0.1' },
    { id: 'hba1c', label: 'HbA1c', unit: '%', type: 'number', placeholder: '6.9', step: '0.1' },
    { id: 'ketones', label: 'Ketones', unit: 'mmol/L', type: 'number', placeholder: '0.1', step: '0.1' }
  ]
},
  {
    id: 'general',
    icon: '📋',
    title: 'General Examination',
    subsections: [
      {
        title: 'Physical Status',
        items: [
          { id: 'sickLooking', label: 'Sick Looking', normalState: false },
          { id: 'fairCondition', label: 'Fair General Condition', normalState: true }
        ]
      },
      {
        title: 'General Inspection',
        items: [
          { id: 'jaundice', label: 'Jaundice', normalState: false },
          { id: 'pallor', label: 'Pallor', normalState: false },
          { id: 'lymphadenopathy', label: 'Lymphadenopathy', normalState: false },
          { id: 'pedal_edema', label: 'Pedal Edema', normalState: false },
          { id: 'cyanosis', label: 'Cyanosis', normalState: false },
          { id: 'wasting', label: 'Wasting', normalState: false },
          { id: 'truncalObesity', label: 'Truncal Obesity', normalState: false },
          { id: 'acanthosisNigricans', label: 'Acanthosis Nigricans', normalState: false },
          { id: 'skinTags', label: 'Skin Tags', normalState: false }
        ]
      }
    ],
    hasNotes: true
  },
  {
    id: 'cardiovascular',
    icon: '❤️',
    title: 'Cardiovascular System',
    subsections: [
      {
        title: 'Heart Sounds',
        items: [
          { id: 'normalS1S2', label: 'Normal S1/S2', normalState: true },
          { id: 'noMurmurs', label: 'No Murmurs', normalState: true },
          { id: 'regularRhythm', label: 'Regular Rhythm', normalState: true },
          { id: 'tachycardia', label: 'Tachycardia', normalState: false },
          { id: 'bradycardia', label: 'Bradycardia', normalState: false },
          { id: 'tricuspidStenosis', label: 'Tricuspid Stenosis', normalState: false },
          { id: 'tricuspidRegurgitation', label: 'Tricuspid Regurgitation', normalState: false },
          { id: 'otherAbnormal', label: 'Other Abnormal', normalState: false }
        ]
      },
      {
        title: 'Heart Rhythm',
        items: [
          { id: 'normalS1S2_rhythm', label: 'Normal S1S2', normalState: true },
          { id: 'noCarotidPulseNormal', label: 'No Carotid Pulse Normal', normalState: false },
          { id: 'normalS1S2_2', label: 'Normal S1S2', normalState: true }
        ]
      }
    ],
    hasNotes: true
  },
  {
    id: 'respiratory',
    icon: '🫁',
    title: 'Respiratory System',
    subsections: [
      {
        title: 'Chest - Right Upper Zone',
        items: [
          { id: 'ruzNoVesicularBreathSounds', label: 'No Vesicular Breath Sounds', normalState: false },
          { id: 'ruzBronchialBreathSounds', label: 'Bronchial Breath Sounds', normalState: false },
          { id: 'ruzRhonchi', label: 'Rhonchi', normalState: false },
          { id: 'ruzNoVesicularBreathSounds_2', label: 'No Vesicular Breath Sounds', normalState: false },
          { id: 'ruzBronchialBreathSounds_2', label: 'Bronchial Breath Sounds', normalState: false },
          { id: 'ruzVelcroCrepitations', label: 'Velcro Crepitations', normalState: false },
          { id: 'ruzNoNormalChestExpansion', label: 'No Normal Chest Expansion', normalState: false },
          { id: 'ruzVesicularBreathSounds', label: 'Vesicular Breath Sounds', normalState: true }
        ]
      },
      {
        title: 'Chest - Right Lower Zone',
        items: [
          { id: 'rlzNoVesicularBreathSounds', label: 'No Vesicular Breath Sounds', normalState: false },
          { id: 'rlzBronchialBreathSounds', label: 'Bronchial Breath Sounds', normalState: false },
          { id: 'rlzRhonchi', label: 'Rhonchi', normalState: false },
          { id: 'rlzNoVesicularBreathSounds_2', label: 'No Vesicular Breath Sounds', normalState: false },
          { id: 'rlzBronchialBreathSounds_2', label: 'Bronchial Breath Sounds', normalState: false },
          { id: 'rlzVelcroCrepitations', label: 'Velcro Crepitations', normalState: false },
          { id: 'rlzNoNormalChestExpansion', label: 'No Normal Chest Expansion', normalState: false },
          { id: 'rlzVesicularBreathSounds', label: 'Vesicular Breath Sounds', normalState: true }
        ]
      },
      {
        title: 'Chest - Left Upper Zone',
        items: [
          { id: 'luzNoVesicularBreathSounds', label: 'No Vesicular Breath Sounds', normalState: false },
          { id: 'luzBronchialBreathSounds', label: 'Bronchial Breath Sounds', normalState: false },
          { id: 'luzRhonchi', label: 'Rhonchi', normalState: false },
          { id: 'luzNoVesicularBreathSounds_2', label: 'No Vesicular Breath Sounds', normalState: false },
          { id: 'luzBronchialBreathSounds_2', label: 'Bronchial Breath Sounds', normalState: false },
          { id: 'luzVelcroCrepitations', label: 'Velcro Crepitations', normalState: false },
          { id: 'luzNoNormalChestExpansion', label: 'No Normal Chest Expansion', normalState: false },
          { id: 'luzVesicularBreathSounds', label: 'Vesicular Breath Sounds', normalState: true }
        ]
      },
      {
        title: 'Chest - Left Lower Zone',
        items: [
          { id: 'llzNoVesicularBreathSounds', label: 'No Vesicular Breath Sounds', normalState: false },
          { id: 'llzBronchialBreathSounds', label: 'Bronchial Breath Sounds', normalState: false },
          { id: 'llzRhonchi', label: 'Rhonchi', normalState: false },
          { id: 'llzNoVesicularBreathSounds_2', label: 'No Vesicular Breath Sounds', normalState: false },
          { id: 'llzBronchialBreathSounds_2', label: 'Bronchial Breath Sounds', normalState: false },
          { id: 'llzVelcroCrepitations', label: 'Velcro Crepitations', normalState: false },
          { id: 'llzNoNormalChestExpansion', label: 'No Normal Chest Expansion', normalState: false },
          { id: 'llzVesicularBreathSounds', label: 'Vesicular Breath Sounds', normalState: true }
        ]
      }
    ],
    hasNotes: true
  },
  {
    id: 'gastrointestinal',
    icon: '🔴',
    title: 'Gastrointestinal System',
    subsections: [
      {
        title: 'General',
        items: [
          { id: 'abdomenSoftNonTender', label: 'Soft, Non-tender', normalState: true },
          { id: 'noDistension', label: 'No Distension', normalState: true },
          { id: 'normalBowelSounds', label: 'Normal Bowel Sounds', normalState: true }
        ]
      },
      {
        title: 'Left Upper Quadrant',
        items: [
          { id: 'luqHepatomeagly', label: 'Hepatomegaly', normalState: false },
          { id: 'luqSplenomegaly', label: 'Splenomegaly', normalState: false },
          { id: 'luqTenderness', label: 'Tenderness', normalState: false },
          { id: 'luqRightKidneyPalpable', label: 'Right Kidney Palpable', normalState: false },
          { id: 'luqLeftKidneyPalpable', label: 'Left Kidney Palpable', normalState: false },
          { id: 'luqPalpableMass', label: 'Palpable Mass', normalState: false },
          { id: 'luqTympanic', label: 'Tympanic', normalState: true },
          { id: 'luqDull', label: 'Dull', normalState: false }
        ]
      },
      {
        title: 'Right Upper Quadrant',
        items: [
          { id: 'ruqHepatomeagly', label: 'Hepatomegaly', normalState: false },
          { id: 'ruqSplenomegaly', label: 'Splenomegaly', normalState: false },
          { id: 'ruqTenderness', label: 'Tenderness', normalState: false },
          { id: 'ruqRightKidneyPalpable', label: 'Right Kidney Palpable', normalState: false },
          { id: 'ruqLeftKidneyPalpable', label: 'Left Kidney Palpable', normalState: false },
          { id: 'ruqPalpableMass', label: 'Palpable Mass', normalState: false },
          { id: 'ruqTympanic', label: 'Tympanic', normalState: true },
          { id: 'ruqDull', label: 'Dull', normalState: false }
        ]
      },
      {
        title: 'Left Lower Quadrant',
        items: [
          { id: 'llqTenderness', label: 'Tenderness', normalState: false },
          { id: 'llqPalpableMass', label: 'Palpable Mass', normalState: false },
          { id: 'llqTympanic', label: 'Tympanic', normalState: true },
          { id: 'llqDull', label: 'Dull', normalState: false },
          { id: 'llqBowelSounds', label: 'Bowel Sounds', normalState: true },
          { id: 'llqRenalBruits', label: 'Renal Bruits', normalState: false },
          { id: 'llqAorticBruits', label: 'Aortic Bruits', normalState: false }
        ]
      },
      {
        title: 'Right Lower Quadrant',
        items: [
          { id: 'rlqTenderness', label: 'Tenderness', normalState: false },
          { id: 'rlqPalpableMass', label: 'Palpable Mass', normalState: false },
          { id: 'rlqTympanic', label: 'Tympanic', normalState: true },
          { id: 'rlqDull', label: 'Dull', normalState: false },
          { id: 'rlqBowelSounds', label: 'Bowel Sounds', normalState: true },
          { id: 'rlqRenalBruits', label: 'Renal Bruits', normalState: false },
          { id: 'rlqAorticBruits', label: 'Aortic Bruits', normalState: false }
        ]
      }
    ],
    hasNotes: true
  },
  {
    id: 'neurological',
    icon: '🧠',
    title: 'Neurological Examination',
    subsections: [
      {
        title: 'Mental Status',
        items: [
          { id: 'alertOriented', label: 'Alert and Oriented', normalState: true },
          { id: 'confused', label: 'Confused', normalState: false },
          { id: 'lethargic', label: 'Lethargic', normalState: false }
        ]
      },
      {
        title: 'Cranial Nerves',
        items: [
          { id: 'cranialNervesIntact', label: 'All Cranial Nerves Intact', normalState: true },
          { id: 'abnormalCranialNerves', label: 'Abnormal Cranial Nerve Findings', normalState: false }
        ]
      },
      {
        title: 'Motor Function',
        items: [
          { id: 'normalStrength', label: 'Normal Strength (5/5)', normalState: true },
          { id: 'weakness', label: 'Weakness', normalState: false },
          { id: 'normalTone', label: 'Normal Tone', normalState: true },
          { id: 'increasedTone', label: 'Increased Tone', normalState: false },
          { id: 'decreasedTone', label: 'Decreased Tone', normalState: false }
        ]
      },
      {
        title: 'Sensory Function',
        items: [
          { id: 'normalSensation', label: 'Normal Sensation', normalState: true },
          { id: 'decreasedSensation', label: 'Decreased Sensation', normalState: false },
          { id: 'numbness', label: 'Numbness', normalState: false },
          { id: 'tingling', label: 'Tingling', normalState: false }
        ]
      },
      {
        title: 'Reflexes',
        items: [
          { id: 'normalReflexes', label: 'Normal Reflexes (2+)', normalState: true },
          { id: 'hyperreflexia', label: 'Hyperreflexia', normalState: false },
          { id: 'hyporeflexia', label: 'Hyporeflexia', normalState: false },
          { id: 'absentReflexes', label: 'Absent Reflexes', normalState: false }
        ]
      },
      {
        title: 'Coordination & Gait',
        items: [
          { id: 'normalGait', label: 'Normal Gait', normalState: true },
          { id: 'ataxia', label: 'Ataxia', normalState: false },
          { id: 'normalCoordination', label: 'Normal Coordination', normalState: true },
          { id: 'dysmetria', label: 'Dysmetria', normalState: false }
        ]
      }
    ],
    hasNotes: true
  },
  {
    id: 'musculoskeletal',
    icon: '🦴',
    title: 'Musculoskeletal System',
    subsections: [
      {
        title: 'Joint Examination',
        items: [
          { id: 'normalROM', label: 'Normal Range of Motion', normalState: true },
          { id: 'limitedROM', label: 'Limited Range of Motion', normalState: false },
          { id: 'noJointSwelling', label: 'No Joint Swelling', normalState: true },
          { id: 'jointSwelling', label: 'Joint Swelling', normalState: false },
          { id: 'noDeformities', label: 'No Deformities', normalState: true },
          { id: 'deformities', label: 'Deformities Present', normalState: false }
        ]
      },
      {
        title: 'Muscle Strength',
        items: [
          { id: 'normalMuscleStrength', label: 'Normal Muscle Strength', normalState: true },
          { id: 'muscleWeakness', label: 'Muscle Weakness', normalState: false },
          { id: 'muscleAtrophy', label: 'Muscle Atrophy', normalState: false }
        ]
      },
      {
        title: 'Spine',
        items: [
          { id: 'normalSpineCurvature', label: 'Normal Spine Curvature', normalState: true },
          { id: 'scoliosis', label: 'Scoliosis', normalState: false },
          { id: 'kyphosis', label: 'Kyphosis', normalState: false },
          { id: 'lordosis', label: 'Lordosis', normalState: false }
        ]
      }
    ],
    hasNotes: true
  },
  {
    id: 'diabeticFoot',
    icon: '🦶',
    title: 'Diabetic Foot Examination',
    subsections: [
      {
        title: 'Left Foot - Plantar Surface',
        items: [
          { id: 'lfpDrySkin', label: 'Dry Skin', normalState: false },
          { id: 'lfpOnychomycosis', label: 'Onychomycosis', normalState: false },
          { id: 'lfpDystrophicNails', label: 'Dystrophic Nails', normalState: false },
          { id: 'lfpHalluxValgus', label: 'Hallux Valgus', normalState: false },
          { id: 'lfpHalluxVarus', label: 'Hallux Varus', normalState: false },
          { id: 'lfpParonychia', label: 'Paronychia', normalState: false },
          { id: 'lfpIngrownToeNail', label: 'Ingrown Toe Nail', normalState: false },
          { id: 'lfpCallus', label: 'Callus', normalState: false },
          { id: 'lfpHeelUlcer', label: 'Heel Ulcer', normalState: false }
        ]
      },
      {
        title: 'Left Foot - Dorsal Surface',
        items: [
          { id: 'lfdDrySkin', label: 'Dry Skin', normalState: false },
          { id: 'lfdOnychomycosis', label: 'Onychomycosis', normalState: false },
          { id: 'lfdDystrophicNails', label: 'Dystrophic Nails', normalState: false },
          { id: 'lfdHalluxValgus', label: 'Hallux Valgus', normalState: false },
          { id: 'lfdHalluxVarus', label: 'Hallux Varus', normalState: false },
          { id: 'lfdParonychia', label: 'Paronychia', normalState: false },
          { id: 'lfdIngrownToeNail', label: 'Ingrown Toe Nail', normalState: false },
          { id: 'lfdCallus', label: 'Callus', normalState: false },
          { id: 'lfdToeUlcer', label: 'Toe Ulcer', normalState: false }
        ]
      },
      {
        title: 'Right Foot - Plantar Surface',
        items: [
          { id: 'rfpDrySkin', label: 'Dry Skin', normalState: false },
          { id: 'rfpOnychomycosis', label: 'Onychomycosis', normalState: false },
          { id: 'rfpDystrophicNails', label: 'Dystrophic Nails', normalState: false },
          { id: 'rfpHalluxValgus', label: 'Hallux Valgus', normalState: false },
          { id: 'rfpHalluxVarus', label: 'Hallux Varus', normalState: false },
          { id: 'rfpParonychia', label: 'Paronychia', normalState: false },
          { id: 'rfpIngrownToeNail', label: 'Ingrown Toe Nail', normalState: false },
          { id: 'rfpCallus', label: 'Callus', normalState: false },
          { id: 'rfpHeelUlcer', label: 'Heel Ulcer', normalState: false }
        ]
      },
      {
        title: 'Right Foot - Dorsal Surface',
        items: [
          { id: 'rfdDrySkin', label: 'Dry Skin', normalState: false },
          { id: 'rfdOnychomycosis', label: 'Onychomycosis', normalState: false },
          { id: 'rfdDystrophicNails', label: 'Dystrophic Nails', normalState: false },
          { id: 'rfdHalluxValgus', label: 'Hallux Valgus', normalState: false },
          { id: 'rfdHalluxVarus', label: 'Hallux Varus', normalState: false },
          { id: 'rfdParonychia', label: 'Paronychia', normalState: false },
          { id: 'rfdIngrownToeNail', label: 'Ingrown Toe Nail', normalState: false },
          { id: 'rfdCallus', label: 'Callus', normalState: false },
          { id: 'rfdToeUlcer', label: 'Toe Ulcer', normalState: false }
        ]
      },
      {
        title: 'Pulses - Left Side',
        items: [
          { id: 'leftAnkleCharcot', label: 'Ankle Charcot Joint', normalState: false },
          { id: 'leftDorsalisPedis', label: 'Dorsalis Pedis Pulse Present', normalState: true },
          { id: 'leftPosteriorTibial', label: 'Posterior Tibialis Pulse Present', normalState: true },
          { id: 'leftAnteriorTibial', label: 'Anterior Tibialis Pulse Present', normalState: true },
          { id: 'leftPopliteal', label: 'Popliteal Pulse Present', normalState: true },
          { id: 'leftFemoral', label: 'Femoral Pulse Present', normalState: true }
        ]
      },
      {
        title: 'Pulses - Right Side',
        items: [
          { id: 'rightAnkleCharcot', label: 'Ankle Charcot Joint', normalState: false },
          { id: 'rightDorsalisPedis', label: 'Dorsalis Pedis Pulse Present', normalState: true },
          { id: 'rightPosteriorTibial', label: 'Posterior Tibialis Pulse Present', normalState: true },
          { id: 'rightAnteriorTibial', label: 'Anterior Tibialis Pulse Present', normalState: true },
          { id: 'rightPopliteal', label: 'Popliteal Pulse Present', normalState: true },
          { id: 'rightFemoral', label: 'Femoral Pulse Present', normalState: true }
        ]
      },
      {
        title: 'Temperature',
        items: [
          { id: 'leftWarmToTouch', label: 'Left Foot - Warm to Touch', normalState: true },
          { id: 'leftCoolExtremity', label: 'Left Foot - Cool', normalState: false },
          { id: 'rightWarmToTouch', label: 'Right Foot - Warm to Touch', normalState: true },
          { id: 'rightCoolExtremity', label: 'Right Foot - Cool', normalState: false }
        ]
      }
    ],
    hasNotes: true
  },
  {
    id: 'clinicalImages',
    icon: '📸',
    title: 'Clinical Images',
    type: 'images',
    description: 'Upload clinical photographs for documentation and progress tracking',
    bodyAreaOptions: [
      'General Appearance',
      'Cardiovascular',
      'Respiratory',
      'Gastrointestinal',
      'Neurological',
      'Musculoskeletal',
      'Skin & Integumentary',
      'Diabetic Foot - Left',
      'Diabetic Foot - Right',
      'Neck/Thyroid',
      'Other'
    ]
  }
];

// Helper function to generate prose from examination data
export const generateFindingsProse = (sectionId, data) => {
  const section = physicalExamSections.find(s => s.id === sectionId);
  if (!section) return '';

  // Handle vital signs differently
  if (section.type === 'vitals') {
    const parts = [];
    section.fields.forEach(field => {
      if (data[field.id]) {
        // Add context for abnormal values
        let value = `${data[field.id]} ${field.unit}`;
        if (field.id === 'bp' && data[field.id]) {
          const bpMatch = data[field.id].match(/(\d+)\/(\d+)/);
          if (bpMatch) {
            const systolic = parseInt(bpMatch[1]);
            if (systolic >= 140) value += ' (borderline high)';
            else if (systolic < 90) value += ' (low)';
          }
        }
        parts.push(`${field.label}: ${value}`);
      }
    });
    return parts.join(', ');
  }

  // Build prose from checkboxes
  const findings = [];
  const abnormal = [];

  section.subsections?.forEach(subsection => {
    subsection.items.forEach(item => {
      const isChecked = data[item.id];

      if (item.normalState) {
        // Normal items: only mention if checked
        if (isChecked) {
          findings.push(item.label.toLowerCase());
        } else {
          abnormal.push(`no ${item.label.toLowerCase()}`);
        }
      } else {
        // Abnormal items: only mention if checked
        if (isChecked) {
          abnormal.push(item.label.toLowerCase());
        }
      }
    });
  });

  // Combine findings, putting abnormal first for emphasis
  let prose = '';
  if (abnormal.length > 0) {
    prose = abnormal.join(', ');
  }
  if (findings.length > 0) {
    if (prose) prose += '. ';
    prose += findings.join(', ');
  }

  // Add custom notes if present
  if (data.notes) {
    prose += prose ? `. ${data.notes}` : data.notes;
  }

  // Capitalize first letter
  return prose ? prose.charAt(0).toUpperCase() + prose.slice(1) : 'No findings recorded';
};