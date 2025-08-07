
interface ProgressIndicatorProps {
  currentStep: number;
  deliveryMethod?: "delivery" | "pickup" | "";
  totalSteps?: number;
}

const getStepLabels = (deliveryMethod: "delivery" | "pickup" | "" = "") => {
  if (deliveryMethod === "pickup") {
    return {
      1: "Customer",
      2: "Products", 
      3: "Method",
      4: "Payment",
      5: "Review"
    };
  }
  
  return {
    1: "Customer",
    2: "Products", 
    3: "Method",
    4: "Order Type",
    5: "Address",
    6: "Payment",
    7: "Review"
  };
};

export function ProgressIndicator({ 
  currentStep, 
  deliveryMethod = "", 
  totalSteps 
}: ProgressIndicatorProps) {
  const steps = totalSteps || (deliveryMethod === "pickup" ? 5 : 7);
  const stepLabels = getStepLabels(deliveryMethod);

  return (
    <div className="mb-6">
      {/* Progress bar */}
      <div className="flex items-center justify-center space-x-3 mb-3">
        {Array.from({ length: steps }, (_, i) => i + 1).map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                step <= currentStep
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {step}
            </div>
            {step < steps && (
              <div
                className={`w-12 h-1 mx-2 ${
                  step < currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            )}
          </div>
        ))}
      </div>
      
      {/* Step labels */}
      <div className="flex items-center justify-center space-x-3">
        {Array.from({ length: steps }, (_, i) => i + 1).map((step) => (
          <div key={step} className="flex items-center">
            <div className="w-16 text-center">
              <span className={`text-xs font-medium ${
                step <= currentStep ? 'text-primary' : 'text-muted-foreground'
              }`}>
                {stepLabels[step as keyof typeof stepLabels]}
              </span>
            </div>
            {step < steps && <div className="w-12" />}
          </div>
        ))}
      </div>
    </div>
  );
}
