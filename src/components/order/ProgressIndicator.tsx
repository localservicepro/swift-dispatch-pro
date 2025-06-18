
interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps?: number;
}

const stepLabels = {
  1: "Customer",
  2: "Products", 
  3: "Order Type",
  4: "Address",
  5: "Details",
  6: "Payment",
  7: "Review"
};

export function ProgressIndicator({ currentStep, totalSteps = 7 }: ProgressIndicatorProps) {
  return (
    <div className="mb-8">
      {/* Progress bar */}
      <div className="flex items-center justify-center space-x-4 mb-4">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step <= currentStep
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {step}
            </div>
            {step < totalSteps && (
              <div
                className={`w-16 h-1 mx-2 ${
                  step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>
      
      {/* Step labels */}
      <div className="flex items-center justify-center space-x-4">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
          <div key={step} className="flex items-center">
            <div className="w-20 text-center">
              <span className={`text-xs font-medium ${
                step <= currentStep ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {stepLabels[step as keyof typeof stepLabels]}
              </span>
            </div>
            {step < totalSteps && <div className="w-16" />}
          </div>
        ))}
      </div>
    </div>
  );
}
