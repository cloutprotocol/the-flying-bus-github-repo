import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RegistrationMonitoringDashboard } from '../RegistrationMonitoringDashboard';
import { registrationMonitoring } from '@/services/registrationMonitoringService';
import type { RegistrationMetrics } from '@/services/registrationMonitoringService';

// Mock the registration monitoring service
vi.mock('@/services/registrationMonitoringService', () => ({
  registrationMonitoring: {
    getRegistrationMetrics: vi.fn(),
    getCurrentSuccessRate: vi.fn()
  }
}));

// Mock recharts components
vi.mock('recharts', () => ({
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn()
  }
}));

const mockMetrics: RegistrationMetrics = {
  total_attempts: 150,
  successful_registrations: 135,
  failed_registrations: 15,
  success_rate: 90,
  average_completion_time_ms: 1200,
  rls_violations: 5,
  service_role_usage: 25,
  by_type: {
    standard: {
      attempts: 100,
      success_rate: 92,
      avg_completion_time: 1000
    },
    invitation: {
      attempts: 50,
      success_rate: 86,
      avg_completion_time: 1600
    }
  },
  error_breakdown: {
    'VALIDATION_ERROR': 8,
    'NETWORK_ERROR': 4,
    'RLS_VIOLATION': 3
  }
};

describe('RegistrationMonitoringDashboard', () => {
  const mockGetRegistrationMetrics = vi.mocked(registrationMonitoring.getRegistrationMetrics);
  const mockGetCurrentSuccessRate = vi.mocked(registrationMonitoring.getCurrentSuccessRate);

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRegistrationMetrics.mockResolvedValue(mockMetrics);
    mockGetCurrentSuccessRate.mockResolvedValue(88.5);
  });

  it('should render loading state initially', () => {
    mockGetRegistrationMetrics.mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<RegistrationMonitoringDashboard />);
    
    expect(screen.getByText('Loading registration metrics...')).toBeInTheDocument();
  });

  it('should render dashboard with metrics after loading', async () => {
    render(<RegistrationMonitoringDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Registration Monitoring')).toBeInTheDocument();
    });

    // Check key metrics cards
    expect(screen.getByText('150')).toBeInTheDocument(); // Total attempts
    expect(screen.getByText('90.0%')).toBeInTheDocument(); // Success rate
    expect(screen.getByText('1200ms')).toBeInTheDocument(); // Avg completion time
    expect(screen.getByText('5')).toBeInTheDocument(); // RLS violations
  });

  it('should display current success rate', async () => {
    render(<RegistrationMonitoringDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Current: 88.5%')).toBeInTheDocument();
    });
  });

  it('should handle error state', async () => {
    const errorMessage = 'Failed to fetch metrics';
    mockGetRegistrationMetrics.mockRejectedValue(new Error(errorMessage));
    
    render(<RegistrationMonitoringDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(`Failed to load registration metrics: ${errorMessage}`)).toBeInTheDocument();
    });
    
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should allow time range selection', async () => {
    render(<RegistrationMonitoringDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Last 24 Hours')).toBeInTheDocument();
    });

    // Click on "Last 7 Days" button
    fireEvent.click(screen.getByText('Last 7 Days'));
    
    await waitFor(() => {
      expect(mockGetRegistrationMetrics).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String)
      );
    });
  });

  it('should refresh metrics when refresh button is clicked', async () => {
    render(<RegistrationMonitoringDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Refresh'));
    
    await waitFor(() => {
      expect(mockGetRegistrationMetrics).toHaveBeenCalledTimes(2);
    });
  });

  it('should export metrics when export button is clicked', async () => {
    // Mock URL.createObjectURL and related methods
    const mockCreateObjectURL = vi.fn(() => 'mock-url');
    const mockRevokeObjectURL = vi.fn();
    const mockClick = vi.fn();
    const mockAppendChild = vi.fn();
    const mockRemoveChild = vi.fn();

    Object.defineProperty(URL, 'createObjectURL', { value: mockCreateObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { value: mockRevokeObjectURL });
    
    const mockAnchor = {
      href: '',
      download: '',
      click: mockClick
    };
    
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);
    vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild);

    render(<RegistrationMonitoringDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Export')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Export'));
    
    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalled();
  });

  it('should display error breakdown in errors tab', async () => {
    render(<RegistrationMonitoringDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Error Analysis')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Error Analysis'));
    
    await waitFor(() => {
      expect(screen.getByText('VALIDATION ERROR')).toBeInTheDocument();
      expect(screen.getByText('NETWORK ERROR')).toBeInTheDocument();
      expect(screen.getByText('RLS VIOLATION')).toBeInTheDocument();
    });
  });

  it('should display performance metrics in performance tab', async () => {
    render(<RegistrationMonitoringDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Performance')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Performance'));
    
    await waitFor(() => {
      expect(screen.getByText('1000ms')).toBeInTheDocument(); // Standard registration time
      expect(screen.getByText('1600ms')).toBeInTheDocument(); // Invitation registration time
    });
  });

  it('should display security information in security tab', async () => {
    render(<RegistrationMonitoringDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Security')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Security'));
    
    await waitFor(() => {
      expect(screen.getByText('RLS Policy Violations')).toBeInTheDocument();
      expect(screen.getByText('Service Role Usage')).toBeInTheDocument();
    });
  });

  it('should show security recommendations based on metrics', async () => {
    // Test with high RLS violations
    const highViolationMetrics = {
      ...mockMetrics,
      rls_violations: 15,
      success_rate: 85
    };
    
    mockGetRegistrationMetrics.mockResolvedValue(highViolationMetrics);
    
    render(<RegistrationMonitoringDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Security')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Security'));
    
    await waitFor(() => {
      expect(screen.getByText('RLS violations detected. Review profile creation policies.')).toBeInTheDocument();
      expect(screen.getByText('Success rate below 90%. Investigate error patterns.')).toBeInTheDocument();
    });
  });

  it('should show positive security message when metrics are good', async () => {
    const goodMetrics = {
      ...mockMetrics,
      rls_violations: 0,
      success_rate: 95
    };
    
    mockGetRegistrationMetrics.mockResolvedValue(goodMetrics);
    
    render(<RegistrationMonitoringDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Security')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Security'));
    
    await waitFor(() => {
      expect(screen.getByText('All security metrics are within acceptable ranges.')).toBeInTheDocument();
    });
  });

  it('should handle empty error breakdown', async () => {
    const noErrorMetrics = {
      ...mockMetrics,
      error_breakdown: {}
    };
    
    mockGetRegistrationMetrics.mockResolvedValue(noErrorMetrics);
    
    render(<RegistrationMonitoringDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Error Analysis')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Error Analysis'));
    
    await waitFor(() => {
      expect(screen.getByText('No errors in selected time range')).toBeInTheDocument();
      expect(screen.getByText('No errors recorded')).toBeInTheDocument();
    });
  });

  it('should display correct success rate colors', async () => {
    // Test different success rate scenarios
    const testCases = [
      { rate: 95, expectedClass: 'text-green-600' },
      { rate: 80, expectedClass: 'text-yellow-600' },
      { rate: 60, expectedClass: 'text-red-600' }
    ];

    for (const testCase of testCases) {
      const testMetrics = { ...mockMetrics, success_rate: testCase.rate };
      mockGetRegistrationMetrics.mockResolvedValue(testMetrics);
      
      const { unmount } = render(<RegistrationMonitoringDashboard />);
      
      await waitFor(() => {
        const successRateElement = screen.getByText(`${testCase.rate.toFixed(1)}%`);
        expect(successRateElement).toHaveClass(testCase.expectedClass);
      });
      
      unmount();
    }
  });

  it('should handle retry after error', async () => {
    mockGetRegistrationMetrics.mockRejectedValueOnce(new Error('Network error'));
    mockGetRegistrationMetrics.mockResolvedValueOnce(mockMetrics);
    
    render(<RegistrationMonitoringDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Retry'));
    
    await waitFor(() => {
      expect(screen.getByText('Registration Monitoring')).toBeInTheDocument();
    });
  });
});