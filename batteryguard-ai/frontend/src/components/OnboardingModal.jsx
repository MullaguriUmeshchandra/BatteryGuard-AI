import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Zap, BatteryCharging, Gauge, ShieldCheck, FileText, ChevronRight, Check, X 
} from 'lucide-react';

const STEPS = [
  {
    icon: Zap,
    title: "Welcome to BatteryGuard AI",
    desc: "An enterprise-grade diagnostic and first-stage screening platform designed for EV battery laboratories, fleet maintenance centers, and battery repurposing facilities.",
    highlight: "Standardized Multi-Phase Diagnostic Protocols"
  },
  {
    icon: BatteryCharging,
    title: "Battery Asset Registry",
    desc: "Manage high-voltage EV battery packs across diverse cell chemistries including LFP, NMC, NCA, and LTO. Monitor asset history, capacity, and commissioning status.",
    highlight: "Comprehensive Chemistry Profiling"
  },
  {
    icon: Gauge,
    title: "Live Diagnostic Testing Workspace",
    desc: "Execute standardized discharge cycles under simulated physics models or real ESP32 microcontroller telemetry. Monitor pack voltage sag, current, and thermal response in real time.",
    highlight: "Real-time Telemetry & Dynamic Charts"
  },
  {
    icon: ShieldCheck,
    title: "Explainable Screening Rule Engine",
    desc: "Automated arbitration classifies packs into GOOD, REVIEW, DEGRADED, or CRITICAL. Every outcome provides transparent rule explanations, measured deviations, and safety recommendations.",
    highlight: "Deterministic Safety Priority Arbitration"
  },
  {
    icon: FileText,
    title: "Engineering Reports & Audit Trails",
    desc: "Generate publication-grade PDF diagnostic reports formatted with corporate branding, metrics tables, and mandatory first-stage screening disclaimers.",
    highlight: "Instant PDF and CSV Data Exports"
  }
];

export default function OnboardingModal() {
  const { showOnboarding, completeOnboarding } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);

  if (!showOnboarding) return null;

  const step = STEPS[currentStep];
  const StepIcon = step.icon;

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeOnboarding();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header decoration */}
        <div className="h-2 bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500" />
        
        <button
          onClick={completeOnboarding}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          {/* Step Icon */}
          <div className="w-14 h-14 rounded-2xl bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-6">
            <StepIcon className="w-8 h-8" />
          </div>

          <div className="inline-block px-3 py-1 mb-3 text-xs font-semibold tracking-wider text-sky-700 dark:text-sky-300 uppercase bg-sky-100 dark:bg-sky-950/60 rounded-full">
            {step.highlight}
          </div>

          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
            {step.title}
          </h2>

          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-8">
            {step.desc}
          </p>

          {/* Stepper Dots & Actions */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="flex gap-2">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === currentStep 
                      ? 'w-8 bg-sky-500' 
                      : i < currentStep 
                      ? 'w-2 bg-emerald-500' 
                      : 'w-2 bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-3">
              {currentStep > 0 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  Previous
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-500 rounded-xl transition-all shadow-md active:scale-95"
              >
                {currentStep === STEPS.length - 1 ? (
                  <>
                    Get Started <Check className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Next <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
