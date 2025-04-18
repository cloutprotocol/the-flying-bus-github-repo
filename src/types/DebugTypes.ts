
export type DebugStepStatus = 'pending' | 'success' | 'error';

export type DebugStep = {
  timestamp: string;
  action: string;
  details?: any;
  status: DebugStepStatus;
};
