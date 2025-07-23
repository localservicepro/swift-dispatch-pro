
interface ProgressIndicatorProps {
  currentStep: number;
  deliveryMethod?: "delivery" | "pickup" | "pickup_delivery" | "";
  totalSteps?: number;
}

const getStepLabels = (deliveryMethod: "delivery" | "pickup" | "pickup_delivery" | "" = "") => {
  if (deliveryMethod === "pickup") {
    return {
      1: "Customer",
      2: "Products", 
      3: "Method",
      4: "Payment",
      5: "Review"
    };
  } else if (deliveryMethod === "pickup_delivery") {
    return {
      1: "Customer",
      2: "Products", 
      3: "Method",
      4: "Pickup",
      5: "Order Type",
      6: "Address",
      7: "Payment",
      8: "Review"
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
  const steps = totalSteps || (
    deliveryMethod === "pickup" ? 5 : 
    deliveryMethod === "pickup_delivery" ? 8 : 7
  );
  const stepLabels = getStepLabels(deliveryMethod);

  return (
    <div className="mb-8">
      {/* Progress bar */}
      <div className="flex items-center justify-center space-x-4 mb-4">
        {Array.from({ length: steps }, (_, i) => i + 1).map((step) => (
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
            {step < steps && (
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
        {Array.from({ length: steps }, (_, i) => i + 1).map((step) => (
          <div key={step} className="flex items-center">
            <div className="w-20 text-center">
              <span className={`text-xs font-medium ${
                step <= currentStep ? 'text-blue-600' : 'text-gray-500'
              }`}>
                {stepLabels[step as keyof typeof stepLabels]}
              </span>
            </div>
            {step < steps && <div className="w-16" />}
          </div>
        ))}
      </div>
    </div>
  );
}
