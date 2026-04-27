interface ProgressIndicatorProps {
  currentStep: number;
  deliveryMethod?: "delivery" | "pickup" | "";
  totalSteps?: number;
  maxReachedStep?: number;
  onStepClick?: (step: number) => void;
}

const getStepLabels = (deliveryMethod: "delivery" | "pickup" | "" = "") => {
  if (deliveryMethod === "pickup") {
    return {
      1: "Customer",
      2: "Products",
      3: "Method",
      4: "Payment",
      5: "Review",
    };
  }

  return {
    1: "Customer",
    2: "Products",
    3: "Method",
    4: "Order Type",
    5: "Address",
    6: "Payment",
    7: "Review",
  };
};

export function ProgressIndicator({
  currentStep,
  deliveryMethod = "",
  totalSteps,
  maxReachedStep,
  onStepClick,
}: ProgressIndicatorProps) {
  const steps = totalSteps || (deliveryMethod === "pickup" ? 5 : 7);
  const stepLabels = getStepLabels(deliveryMethod);
  const reached = maxReachedStep ?? currentStep;

  const handleClick = (step: number) => {
    if (!onStepClick) return;
    if (step <= reached) onStepClick(step);
  };

  return (
    <div className="mb-6">
      {/* Progress bar */}
      <div className="flex items-center justify-center space-x-3 mb-3">
        {Array.from({ length: steps }, (_, i) => i + 1).map((step) => {
          const isClickable = !!onStepClick && step <= reached;
          const label = stepLabels[step as keyof typeof stepLabels];
          return (
            <div key={step} className="flex items-center">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => handleClick(step)}
                title={isClickable ? `Go to ${label}` : label}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition ${
                  step <= currentStep
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                } ${
                  isClickable
                    ? "cursor-pointer hover:ring-2 hover:ring-primary/40 focus:outline-none focus:ring-2 focus:ring-primary"
                    : "cursor-not-allowed opacity-90"
                }`}
              >
                {step}
              </button>
              {step < steps && (
                <div
                  className={`w-12 h-1 mx-2 ${
                    step < currentStep ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step labels */}
      <div className="flex items-center justify-center space-x-3">
        {Array.from({ length: steps }, (_, i) => i + 1).map((step) => {
          const isClickable = !!onStepClick && step <= reached;
          const label = stepLabels[step as keyof typeof stepLabels];
          return (
            <div key={step} className="flex items-center">
              <div className="w-16 text-center">
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => handleClick(step)}
                  className={`text-xs font-medium ${
                    step <= currentStep ? "text-primary" : "text-muted-foreground"
                  } ${isClickable ? "hover:underline cursor-pointer" : "cursor-default"}`}
                >
                  {label}
                </button>
              </div>
              {step < steps && <div className="w-12" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
