import { createContext, useContext, useState } from 'react';

const TreatmentPlanContext = createContext();

export const useTreatmentPlanContext = () => {
  const context = useContext(TreatmentPlanContext);
  if (!context) {
    throw new Error('useTreatmentPlanContext must be used within TreatmentPlanProvider');
  }
  return context;
};

export const TreatmentPlanProvider = ({ children }) => {
  // Store all treatment plans
  const [treatmentPlans, setTreatmentPlans] = useState([
    // John Doe (CDC001) - Complete treatment progression over 6 months
    {
      id: 1,
      uhid: 'CDC001',
      patientName: 'John Doe',
      doctorName: 'Dr. Ahmed Hassan',
      date: '2026-01-05',
      time: '10:30 AM',
      diagnosis: 'Type 2 Diabetes Mellitus - Poorly Controlled, HbA1c 9.5%',
      plan: `• Medication Adjustments:
  - Continue Metformin 1000mg twice daily with meals
  - Increase Glimepiride to 4mg once daily before breakfast
  - START Insulin Glargine 10 units at bedtime
  
• Monitoring:
  - SMBG 4 times daily (fasting, pre-lunch, pre-dinner, bedtime)
  - Keep detailed blood sugar log
  - HbA1c repeat in 3 months (target <7%)
  - Weekly phone check-ins for insulin titration
  
• Lifestyle Modifications:
  - Carbohydrate counting: 45-60g per meal
  - Increase walking to 45 minutes daily
  - Weight loss goal: 3kg in next 2 months
  - Attend diabetes education class on insulin use
  
• Follow-up:
  - Return in 2 weeks for insulin dose adjustment
  - Continue dietitian sessions weekly
  
• Patient Education:
  - Hypoglycemia recognition and treatment
  - Proper insulin injection technique
  - Sick day management`,
      status: 'Active',
      consultationId: 5
    },
    {
      id: 2,
      uhid: 'CDC001',
      patientName: 'John Doe',
      doctorName: 'Dr. Ahmed Hassan',
      date: '2025-12-01',
      time: '09:15 AM',
      diagnosis: 'Type 2 Diabetes Mellitus - Inadequate Control, HbA1c 9.8%',
      plan: `• Medication Changes:
  - Increase Metformin to 1000mg twice daily (from 500mg)
  - Add Glimepiride 2mg once daily before breakfast
  - Continue Atorvastatin 20mg at bedtime
  
• Monitoring:
  - Check SMBG fasting and 2hrs post-meal daily
  - Keep blood sugar log - bring to next visit
  - HbA1c repeat in 3 months
  - Blood pressure monitoring weekly
  
• Lifestyle:
  - Reduce carbohydrate intake to 45-60g per meal
  - Start walking 30 minutes daily, 5 days/week
  - Target weight loss: 5kg in 3 months (current 92kg, target 87kg)
  
• Follow-up:
  - Return in 4 weeks for medication adjustment
  - Phone check-in at 2 weeks
  
• Referrals:
  - URGENT: Ophthalmology for dilated eye exam
  - Dietitian consultation scheduled for next week
  - Diabetes education program enrollment`,
      status: 'Completed',
      consultationId: 4
    },
    {
      id: 3,
      uhid: 'CDC001',
      patientName: 'John Doe',
      doctorName: 'Dr. Ahmed Hassan',
      date: '2025-09-15',
      time: '02:30 PM',
      diagnosis: 'Type 2 Diabetes Mellitus - Newly Diagnosed, HbA1c 10.2%',
      plan: `• Initial Medication Regimen:
  - START Metformin 500mg twice daily with meals
  - START Atorvastatin 20mg once daily at bedtime
  
• Baseline Monitoring:
  - SMBG twice daily (fasting and post-dinner)
  - Purchase glucometer and supplies
  - Learn proper testing technique
  - HbA1c repeat in 3 months
  
• Lifestyle Foundation:
  - Referral to dietitian for meal planning
  - Start with 15-minute walks after meals
  - Avoid sugary drinks completely
  - Read food labels for carbohydrate content
  
• Initial Education:
  - Diabetes pathophysiology and complications
  - SMBG technique training
  - Foot care basics
  - Recognition of hyper/hypoglycemia
  
• Follow-up:
  - Return in 6 weeks to assess medication tolerance
  - Bring blood sugar log
  
• Baseline Tests Ordered:
  - Lipid profile, kidney function, liver function
  - Urine albumin/creatinine ratio
  - Retinal photography`,
      status: 'Completed',
      consultationId: 3
    },

    // Mary Johnson (CDC005) - Stable diabetes management
    {
      id: 4,
      uhid: 'CDC005',
      patientName: 'Mary Johnson',
      doctorName: 'Dr. Ahmed Hassan',
      date: '2025-12-20',
      time: '11:00 AM',
      diagnosis: 'Type 2 Diabetes Mellitus - Well Controlled, HbA1c 6.8%',
      plan: `• Continue Current Regimen:
  - Metformin 500mg twice daily with meals
  - Atorvastatin 20mg at bedtime
  
• Monitoring:
  - SMBG 3 times weekly (fasting only)
  - HbA1c in 6 months
  - Annual comprehensive labs due in March
  
• Lifestyle Maintenance:
  - Continue current exercise routine (walking 30 min, 5x/week)
  - Maintain balanced Mediterranean-style diet
  - Annual nutrition review scheduled
  
• Preventive Care:
  - Annual eye exam scheduled for January
  - Foot exam today - no issues noted
  - Influenza vaccination given today
  
• Follow-up:
  - Routine visit in 6 months
  - Contact if blood sugar >180 mg/dL or <70 mg/dL
  
• Patient doing excellent - congratulated on maintaining target HbA1c!`,
      status: 'Active',
      consultationId: 6
    },
    {
      id: 5,
      uhid: 'CDC005',
      patientName: 'Mary Johnson',
      doctorName: 'Dr. Ahmed Hassan',
      date: '2025-06-15',
      time: '10:45 AM',
      diagnosis: 'Type 2 Diabetes Mellitus - Adequately Controlled, HbA1c 7.1%',
      plan: `• Medication Continuation:
  - Continue Metformin 500mg twice daily
  - Continue Atorvastatin 20mg at bedtime
  
• Monitoring:
  - SMBG 3-4 times weekly (fasting)
  - HbA1c repeat in 6 months
  - Lipid profile in 6 months
  
• Lifestyle:
  - Maintain current exercise routine
  - Balanced diet with portion control
  - Patient reports good adherence
  
• Follow-up:
  - Return in 6 months for routine follow-up
  - Contact if any concerns arise`,
      status: 'Completed',
      consultationId: 7
    },

    // Sarah Williams (CDC003) - Intensive management
    {
      id: 6,
      uhid: 'CDC003',
      patientName: 'Sarah Williams',
      doctorName: 'Dr. Ahmed Hassan',
      date: '2026-01-03',
      time: '03:00 PM',
      diagnosis: 'Type 1 Diabetes Mellitus - Suboptimal Control, HbA1c 8.2%',
      plan: `• Insulin Regimen Optimization:
  - Insulin Glargine 24 units at bedtime (increased from 20 units)
  - Insulin Aspart: carb ratio 1:10, correction factor 1:40
  - Adjust doses based on CGM trends
  
• Technology:
  - Continue CGM (Continuous Glucose Monitor)
  - Review CGM reports - address dawn phenomenon
  - Consider insulin pump consultation if HbA1c not improved
  
• Monitoring:
  - CGM 24/7 with alerts set
  - Download CGM data weekly
  - HbA1c in 3 months
  
• Lifestyle:
  - Advanced carbohydrate counting review
  - Exercise with glucose monitoring before/after
  - Stress management techniques
  
• Follow-up:
  - Telehealth check-in in 2 weeks
  - In-person visit in 6 weeks
  
• Concerns:
  - Patient reports frequent nocturnal hypoglycemia
  - Adjusted basal insulin timing and dose`,
      status: 'Active',
      consultationId: 8
    },

    // Robert Martinez (CDC004) - Pre-diabetes progression
    {
      id: 7,
      uhid: 'CDC004',
      patientName: 'Robert Martinez',
      doctorName: 'Dr. Ahmed Hassan',
      date: '2025-11-10',
      time: '01:45 PM',
      diagnosis: 'Pre-Diabetes, HbA1c 6.2% (increased from 5.9%)',
      plan: `• Intensified Lifestyle Intervention:
  - NO medications at this time - lifestyle first approach
  - Target 7-10% weight loss (current 95kg, target 88kg)
  
• Diet Modifications:
  - Reduce portion sizes by 25%
  - Eliminate sugary beverages completely
  - Increase fiber to 25-30g daily
  - Mediterranean diet pattern
  - Meal timing: avoid late-night eating
  
• Physical Activity:
  - Increase to 150 minutes moderate exercise weekly
  - Add resistance training 2x/week
  - Track steps - goal 10,000 daily
  
• Monitoring:
  - HbA1c repeat in 6 months
  - Home glucose checks if desired (not required)
  - Weekly weight monitoring
  
• Follow-up:
  - Return in 3 months for progress check
  - May consider Metformin if no improvement
  
• Education:
  - Diabetes prevention program enrollment
  - Reviewed progression risk factors`,
      status: 'Active',
      consultationId: 9
    }
  ]);

  // Add new treatment plan
  const addTreatmentPlan = (planData) => {
    const newPlan = {
      id: treatmentPlans.length + 1,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }),
      status: 'Active',
      ...planData
    };
    
    // Mark previous plans for same patient as 'Completed'
    setTreatmentPlans(prevPlans => [
      newPlan,
      ...prevPlans.map(plan => 
        plan.uhid === planData.uhid && plan.status === 'Active'
          ? { ...plan, status: 'Completed' }
          : plan
      )
    ]);
    
    return newPlan;
  };

  // Get all plans for a patient
  const getPlansByPatient = (uhid) => {
    return treatmentPlans
      .filter(plan => plan.uhid === uhid)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  // Get latest plan for a patient
  const getLatestPlan = (uhid) => {
    const patientPlans = treatmentPlans
      .filter(plan => plan.uhid === uhid)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    return patientPlans[0] || null;
  };

  // Get active plan for a patient
  const getActivePlan = (uhid) => {
    return treatmentPlans.find(
      plan => plan.uhid === uhid && plan.status === 'Active'
    ) || null;
  };

  // Update plan status
  const updatePlanStatus = (planId, newStatus) => {
    setTreatmentPlans(prevPlans =>
      prevPlans.map(plan =>
        plan.id === planId ? { ...plan, status: newStatus } : plan
      )
    );
  };

  // Get statistics
  const getPlanStats = () => {
    const active = treatmentPlans.filter(p => p.status === 'Active').length;
    const completed = treatmentPlans.filter(p => p.status === 'Completed').length;
    
    return {
      total: treatmentPlans.length,
      active,
      completed
    };
  };

  const value = {
    treatmentPlans,
    addTreatmentPlan,
    getPlansByPatient,
    getLatestPlan,
    getActivePlan,
    updatePlanStatus,
    getPlanStats
  };

  return (
    <TreatmentPlanContext.Provider value={value}>
      {children}
    </TreatmentPlanContext.Provider>
  );
};