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
      { id: 'rbs', label: 'RBS', unit: 'mg/dL', type: 'number', placeholder: '12.5', step: '0.1' },
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
          { id: 'normalS1S2', label: 'Normal S1S2', normalState: true },
          { id: 'regularRhythm', label: 'Regular Rhythm', normalState: true },
          { id: 'murmursPresent', label: 'Murmurs Present', normalState: false }
        ]
      },
      {
        title: 'Aortic Area',
        items: [
          { id: 'aorticRegurgitation', label: 'Aortic Regurgitation', normalState: false },
          { id: 'aorticStenosis', label: 'Aortic Stenosis', normalState: false },
          { id: 'aorticOther', label: 'Other', normalState: false }
        ]
      },
      {
        title: 'Tricuspid Area',
        items: [
          { id: 'tricuspidRegurgitation', label: 'Tricuspid Regurgitation', normalState: false },
          { id: 'tricuspidStenosis', label: 'Tricuspid Stenosis', normalState: false }
        ]
      },
      {
        title: 'Pulmonary Area',
        items: [
          { id: 'palpableThrill', label: 'Palpable Thrill', normalState: false },
          { id: 'palpableP2', label: 'Palpable P2', normalState: false },
          { id: 'pulmonaryRegurgitation', label: 'Pulmonary Regurgitation', normalState: false },
          { id: 'pulmonaryStenosis', label: 'Pulmonary Stenosis', normalState: false }
        ]
      },
      {
        title: 'Mitral Area',
        items: [
          { id: 'mitralPalpableThrill', label: 'Palpable Thrill', normalState: false },
          { id: 'mitralS1', label: 'S1', normalState: true },
          { id: 'mitralS2', label: 'S2', normalState: true },
          { id: 'mitralS3', label: 'S3', normalState: false },
          { id: 'mitralS4', label: 'S4', normalState: false },
          { id: 'mitralRegurgitation', label: 'Mitral Regurgitation', normalState: false },
          { id: 'mitralStenosis', label: 'Mitral Stenosis', normalState: false },
          { id: 'murmursPresent', label: 'Murmurs Present', normalState: false }
        ]
      },
      {
        title: 'Carotid Area',
        items: [
          { id: 'carotidPulseNormal', label: 'Carotid Pulse Normal', normalState: true },
          { id: 'carotidBruit', label: 'Carotid Bruit', normalState: false },
          { id: 'otherCarotidAnomaly', label: 'Other Carotid Anomaly', normalState: false }
        ]
      },
      {
        title: 'Other Findings',
        items: [
          { id: 'peripheralEdema', label: 'Peripheral Edema', normalState: false },
          { id: 'jugularVenousDistension', label: 'Jugular Venous Distension', normalState: false }
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
        title: 'Trachea',
        items: [
          { id: 'tracheaStridor', label: 'Stridor', normalState: false },
          { id: 'tracheaDeviatedRight', label: 'Deviated Right', normalState: false },
          { id: 'tracheaDeviatedLeft', label: 'Deviated Left', normalState: false }
        ]
      },
      {
        title: 'Left Upper Lung Zone',
        items: [
          { id: 'luVesicularBreath', label: 'Vesicular Breath Sounds', normalState: true },
          { id: 'luBronchialBreath', label: 'Bronchial Breath Sounds', normalState: false },
          { id: 'luFineCrepitations', label: 'Fine Crepitations', normalState: false },
          { id: 'luCoarseCrepitations', label: 'Coarse Crepitations', normalState: false },
          { id: 'luVelcroCrepitations', label: 'Velcro Crepitations', normalState: false },
          { id: 'luTransmittedSounds', label: 'Transmitted Sounds', normalState: false },
          { id: 'luWheeze', label: 'Wheeze', normalState: false },
          { id: 'luRhonchi', label: 'Rhonchi', normalState: false }
        ]
      },
      {
        title: 'Right Upper Lung Zone',
        items: [
          { id: 'ruVesicularBreath', label: 'Vesicular Breath Sounds', normalState: true },
          { id: 'ruBronchialBreath', label: 'Bronchial Breath Sounds', normalState: false },
          { id: 'ruFineCrepitations', label: 'Fine Crepitations', normalState: false },
          { id: 'ruCoarseCrepitations', label: 'Coarse Crepitations', normalState: false },
          { id: 'ruVelcroCrepitations', label: 'Velcro Crepitations', normalState: false },
          { id: 'ruTransmittedSounds', label: 'Transmitted Sounds', normalState: false },
          { id: 'ruWheeze', label: 'Wheeze', normalState: false },
          { id: 'ruRhonchi', label: 'Rhonchi', normalState: false }
        ]
      },
      {
        title: 'Left Lower Lung Zone',
        items: [
          { id: 'llVesicularBreath', label: 'Vesicular Breath Sounds', normalState: true },
          { id: 'llBronchialBreath', label: 'Bronchial Breath Sounds', normalState: false },
          { id: 'llFineCrepitations', label: 'Fine Crepitations', normalState: false },
          { id: 'llCoarseCrepitations', label: 'Coarse Crepitations', normalState: false },
          { id: 'llVelcroCrepitations', label: 'Velcro Crepitations', normalState: false },
          { id: 'llTransmittedSounds', label: 'Transmitted Sounds', normalState: false },
          { id: 'llWheeze', label: 'Wheeze', normalState: false },
          { id: 'llRhonchi', label: 'Rhonchi', normalState: false }
        ]
      },
      {
        title: 'Right Lower Lung Zone',
        items: [
          { id: 'rlVesicularBreath', label: 'Vesicular Breath Sounds', normalState: true },
          { id: 'rlBronchialBreath', label: 'Bronchial Breath Sounds', normalState: false },
          { id: 'rlFineCrepitations', label: 'Fine Crepitations', normalState: false },
          { id: 'rlCoarseCrepitations', label: 'Coarse Crepitations', normalState: false },
          { id: 'rlVelcroCrepitations', label: 'Velcro Crepitations', normalState: false },
          { id: 'rlTransmittedSounds', label: 'Transmitted Sounds', normalState: false },
          { id: 'rlWheeze', label: 'Wheeze', normalState: false },
          { id: 'rlRhonchi', label: 'Rhonchi', normalState: false }
        ]
      },
      {
        title: 'Chest Expansion',
        items: [
          { id: 'normalChestExpansion', label: 'Normal Chest Expansion', normalState: true },
          { id: 'reducedChestExpansion', label: 'Reduced Chest Expansion', normalState: false }
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
    title: 'Central Nervous System',
    subsections: [
      {
        title: 'Mental Status',
        items: [
          { id: 'alertOriented', label: 'Alert and Oriented', normalState: true },
          { id: 'normalCognition', label: 'Normal Cognition', normalState: true }
        ]
      },
      {
        title: 'Motor Function',
        items: [
          { id: 'normalMusclePower', label: 'Normal Muscle Power', normalState: true },
          { id: 'normalMuscleTone', label: 'Normal Muscle Tone', normalState: true },
          { id: 'muscleWeakness', label: 'Muscle Weakness', normalState: false },
          { id: 'muscleAtrophy', label: 'Muscle Atrophy', normalState: false }
        ]
      },
      {
        title: 'Reflexes',
        items: [
          { id: 'normalReflexes', label: 'Normal Reflexes', normalState: true },
          { id: 'ankleReflexDiminished', label: 'Ankle Reflex Slightly Diminished', normalState: false },
          { id: 'diminishedReflexes', label: 'Diminished Reflexes', normalState: false },
          { id: 'hyperreflexia', label: 'Hyperreflexia', normalState: false }
        ]
      },
      {
        title: 'Sensory',
        items: [
          { id: 'normalSensation', label: 'Normal Sensation', normalState: true },
          { id: 'tinglingToes', label: 'Mild Tingling in Toes', normalState: false },
          { id: 'numbness', label: 'Numbness', normalState: false },
          { id: 'reducedVibrationSense', label: 'Reduced Vibration Sense', normalState: false }
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
          { id: 'lfpMonofilamentNormal', label: '10g Monofilament - Normal', normalState: true },
          { id: 'lfpMonofilamentReduced', label: '10g Monofilament - Reduced Sensation', normalState: false },
          { id: 'lfpVibration128Normal', label: '128 Hz Vibration - Normal', normalState: true },
          { id: 'lfpVibration128Reduced', label: '128 Hz Vibration - Reduced', normalState: false },
          { id: 'lfpHighArchedFoot', label: 'High Arched Foot', normalState: false },
          { id: 'lfpFootUlcer', label: 'Foot Ulcer', normalState: false },
          { id: 'lfpHammerToe', label: 'Hammer Toe', normalState: false },
          { id: 'lfpClawToe', label: 'Claw Toe', normalState: false },
          { id: 'lfpInterdigitalMycosis', label: 'Interdigital Mycosis', normalState: false }
        ]
      },
      {
        title: 'Right Foot - Plantar Surface',
        items: [
          { id: 'rfpMonofilamentNormal', label: '10g Monofilament - Normal', normalState: true },
          { id: 'rfpMonofilamentReduced', label: '10g Monofilament - Reduced Sensation', normalState: false },
          { id: 'rfpVibration128Normal', label: '128 Hz Vibration - Normal', normalState: true },
          { id: 'rfpVibration128Reduced', label: '128 Hz Vibration - Reduced', normalState: false },
          { id: 'rfpHighArchedFoot', label: 'High Arched Foot', normalState: false },
          { id: 'rfpFootUlcer', label: 'Foot Ulcer', normalState: false },
          { id: 'rfpHammerToe', label: 'Hammer Toe', normalState: false },
          { id: 'rfpClawToe', label: 'Claw Toe', normalState: false },
          { id: 'rfpInterdigitalMycosis', label: 'Interdigital Mycosis', normalState: false }
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