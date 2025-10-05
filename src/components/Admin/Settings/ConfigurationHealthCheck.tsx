import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { useStartupValidation, useHealthMonitoring } from '@/hooks/useStartupValidation';
import { ConfigurationUtils } from '@/utils/configurationUtils';
import { configurationValidationService, HealthCheckResult } from '@/services/configurationValidationService';

export function ConfigurationHealthCheck() {
  const [isRunningFullCheck, setIsRunningFullCheck] = useState(false);
  const [fullCheckResult, setFullCheckResult] = useState<HealthCheckResult | null>(null);
  
  const { 
    isValidating, 
    isValid, 
    validationResult, 
    error, 
    validateConfiguration 
  } = useStartupValidation(false);

  const { 
    status: healthStatus, 
    lastCheck, 
    isChecking, 
    performHealthCheck 
  } = useHealthMonitoring(300000); // Check every 5 minutes

  const handleFullValidation = async () => {
    setIsRunningFullCheck(true);
    try {
      await validateConfiguration();
      const healthResult = await configurationValidationService.performHealthCheck();
      setFullCheckResult(healthResult);
    } catch (error) {
      console.error('Full validation failed:', error);
    } finally {
      setIsRunningFullCheck(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warn':
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'fail':
      case 'unhealthy':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'pass' || status === 'healthy' ? 'default' : 
                   status === 'warn' || status === 'degraded' ? 'secondary' : 'destructive';
    
    return (
      <Badge variant={variant} className="ml-2">
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Overall System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            System Health Status
            <div className="flex items-center space-x-2">
              {getStatusIcon(healthStatus)}
              {getStatusBadge(healthStatus)}
            </div>
          </CardTitle>
          <CardDescription>
            Real-time monitoring of system health and configuration
            {lastCheck && (
              <span className="block text-sm text-muted-foreground mt-1">
                Last checked: {new Date(lastCheck).toLocaleString()}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Button 
              onClick={performHealthCheck} 
              disabled={isChecking}
              variant="outline"
              size="sm"
            >
              {isChecking ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refresh Health Check
            </Button>
            
            <Button 
              onClick={handleFullValidation} 
              disabled={isRunningFullCheck || isValidating}
              size="sm"
            >
              {(isRunningFullCheck || isValidating) ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Run Full Validation
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Validation Results */}
      {validationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              Configuration Validation
              {getStatusIcon(isValid ? 'pass' : 'fail')}
              {getStatusBadge(isValid ? 'pass' : 'fail')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Errors */}
            {validationResult.errors.length > 0 && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Errors found:</strong>
                  <ul className="list-disc list-inside mt-2">
                    {validationResult.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Warnings */}
            {validationResult.warnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warnings:</strong>
                  <ul className="list-disc list-inside mt-2">
                    {validationResult.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Validation Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Service Role Key</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Exists:</span>
                    {getStatusIcon(validationResult.details.serviceRoleKey.exists ? 'pass' : 'fail')}
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Valid Format:</span>
                    {getStatusIcon(validationResult.details.serviceRoleKey.format ? 'pass' : 'fail')}
                  </div>
                  {validationResult.details.serviceRoleKey.permissions !== undefined && (
                    <div className="flex items-center justify-between">
                      <span>Permissions:</span>
                      {getStatusIcon(validationResult.details.serviceRoleKey.permissions ? 'pass' : 'fail')}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Edge Functions</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Connectivity:</span>
                    {getStatusIcon(validationResult.details.edgeFunctions.connectivity ? 'pass' : 'fail')}
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Authentication:</span>
                    {getStatusIcon(validationResult.details.edgeFunctions.authentication ? 'pass' : 'fail')}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Database</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Connection:</span>
                    {getStatusIcon(validationResult.details.database.connection ? 'pass' : 'fail')}
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Tables:</span>
                    {getStatusIcon(validationResult.details.database.tables ? 'pass' : 'fail')}
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Functions:</span>
                    {getStatusIcon(validationResult.details.database.functions ? 'pass' : 'fail')}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Environment</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Required Variables:</span>
                    {getStatusIcon(validationResult.details.environment.requiredVars ? 'pass' : 'fail')}
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Supabase Config:</span>
                    {getStatusIcon(validationResult.details.environment.supabaseConfig ? 'pass' : 'fail')}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Health Check Details */}
      {fullCheckResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              Detailed Health Check
              {getStatusIcon(fullCheckResult.status)}
              {getStatusBadge(fullCheckResult.status)}
            </CardTitle>
            <CardDescription>
              Comprehensive system health analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(fullCheckResult.checks).map(([checkName, checkResult]) => (
                <div key={checkName} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(checkResult.status)}
                    <div>
                      <div className="font-medium capitalize">{checkName.replace(/([A-Z])/g, ' $1')}</div>
                      <div className="text-sm text-muted-foreground">{checkResult.message}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(checkResult.status)}
                    {checkResult.duration && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {checkResult.duration}ms
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Validation Error:</strong> {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}