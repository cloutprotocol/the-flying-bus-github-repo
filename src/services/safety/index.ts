
/**
 * Safety Service
 * Central export for all safety and content moderation related services
 */

// Export all types
export * from './types';

// Export all services
export * from './reportingService';
export * from './warningService';
export * from './reportsService';

// Create a combined default export
import * as reportingService from './reportingService';
import * as warningService from './warningService';
import * as reportsService from './reportsService';

export default {
  ...reportingService,
  ...warningService,
  ...reportsService
};
