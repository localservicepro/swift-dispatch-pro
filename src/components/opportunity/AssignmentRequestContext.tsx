import { createContext, useContext, ReactNode } from "react";

type AssignmentRequestHandler = (order: any) => void;

const AssignmentRequestContext = createContext<AssignmentRequestHandler | null>(null);

export function AssignmentRequestProvider({
  onRequestAssignment,
  children,
}: {
  onRequestAssignment: AssignmentRequestHandler;
  children: ReactNode;
}) {
  return (
    <AssignmentRequestContext.Provider value={onRequestAssignment}>
      {children}
    </AssignmentRequestContext.Provider>
  );
}

// Returns null when rendered outside the pipeline (e.g. drag overlay previews).
export function useAssignmentRequest() {
  return useContext(AssignmentRequestContext);
}
