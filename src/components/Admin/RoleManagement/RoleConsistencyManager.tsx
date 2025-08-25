/**
 * Role Consistency Manager Component
 * 
 * Provides admin interface for managing role consistency, detecting inconsistencies,
 * and fixing role assignment issues.
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  RoleConsistencyService, 
  RoleInconsistency, 
  RoleConsistencyReport,
  RoleFixResult 
} from '@/services/roleConsistencyService';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { AlertTriangle, CheckCircle, Users, RefreshCw, Wrench } from 'lucide-react';

export const RoleConsistencyManager: React.FC = () => {
  const [report, setReport] = useState<RoleConsistencyReport | null>(null);
  const [inconsistencies, setInconsistencies] = useState<RoleInconsistency[]>([]);
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [fixResults, setFixResults] = useState<RoleFixResult[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadConsistencyReport();
  }, []);

  const loadConsistencyReport = async () => {
    try {
      setLoading(true);
      const reportData = await RoleConsistencyService.generateConsistencyReport();
      setReport(reportData);
      setInconsistencies(reportData.inconsistencies);
    } catch (error) {
      console.error('Failed to load consistency report:', error);
      toast({
        title: 'Error',
        description: 'Failed to load role consistency report',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const runValidation = async () => {
    try {
      setLoading(true);
      const validationResult = await RoleConsistencyService.validateRoleConsistency();
      setInconsistencies(validationResult.inconsistencies);
      
      toast({
        title: 'Validation Complete',
        description: `Found ${validationResult.inconsistencies.length} inconsistencies`,
        variant: validationResult.inconsistencies.length === 0 ? 'default' : 'destructive'
      });

      // Refresh the full report
      await loadConsistencyReport();
    } catch (error) {
      console.error('Failed to run validation:', error);
      toast({
        title: 'Error',
        description: 'Failed to run role validation',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fixSingleRole = async (inconsistency: RoleInconsistency) => {
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'You must be logged in to fix roles',
        variant: 'destructive'
      });
      return;
    }

    try {
      setFixing(true);
      const result = await RoleConsistencyService.fixUserRole(
        inconsistency.userId,
        inconsistency.expectedRole,
        user.id,
        inconsistency.reason
      );

      if (result.success) {
        toast({
          title: 'Role Fixed',
          description: `Successfully updated ${result.userEmail} from ${result.oldRole} to ${result.newRole}`,
          variant: 'default'
        });

        // Remove the fixed inconsistency from the list
        setInconsistencies(prev => prev.filter(i => i.userId !== inconsistency.userId));
      } else {
        toast({
          title: 'Fix Failed',
          description: result.error || 'Failed to fix role',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error fixing role:', error);
      toast({
        title: 'Error',
        description: 'An error occurred while fixing the role',
        variant: 'destructive'
      });
    } finally {
      setFixing(false);
    }
  };

  const fixAllRoles = async () => {
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'You must be logged in to fix roles',
        variant: 'destructive'
      });
      return;
    }

    if (inconsistencies.length === 0) {
      toast({
        title: 'No Issues',
        description: 'No role inconsistencies to fix',
        variant: 'default'
      });
      return;
    }

    try {
      setFixing(true);
      const results = await RoleConsistencyService.fixMultipleRoles(inconsistencies, user.id);
      setFixResults(results);

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      toast({
        title: 'Bulk Fix Complete',
        description: `Fixed ${successCount} roles, ${failureCount} failed`,
        variant: failureCount === 0 ? 'default' : 'destructive'
      });

      // Refresh the data
      await loadConsistencyReport();
    } catch (error) {
      console.error('Error fixing multiple roles:', error);
      toast({
        title: 'Error',
        description: 'An error occurred during bulk role fixing',
        variant: 'destructive'
      });
    } finally {
      setFixing(false);
    }
  };

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'default';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <AlertTriangle className="h-4 w-4" />;
      case 'low': return <AlertTriangle className="h-4 w-4" />;
      default: return null;
    }
  };

  if (loading && !report) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading role consistency report...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{report.summary.totalUsers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Correct Roles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {report.summary.usersWithCorrectRoles}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Incorrect Roles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {report.summary.usersWithIncorrectRoles}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Consistency</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{report.summary.consistencyPercentage}%</div>
              <Progress value={report.summary.consistencyPercentage} className="mt-2" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Role Consistency Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button 
              onClick={runValidation} 
              disabled={loading}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Run Validation
            </Button>
            
            {inconsistencies.length > 0 && (
              <Button 
                onClick={fixAllRoles} 
                disabled={fixing}
                variant="default"
              >
                <Wrench className={`h-4 w-4 mr-2 ${fixing ? 'animate-spin' : ''}`} />
                Fix All Issues ({inconsistencies.length})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      {report && report.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.recommendations.map((recommendation, index) => (
                <Alert key={index}>
                  <AlertDescription>{recommendation}</AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fix Results */}
      {fixResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Fix Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {fixResults.map((result, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <span className="font-medium">{result.userEmail}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {result.oldRole} → {result.newRole}
                    </span>
                  </div>
                  <Badge variant={result.success ? 'default' : 'destructive'}>
                    {result.success ? 'Fixed' : 'Failed'}
                  </Badge>
                  {!result.success && result.error && (
                    <span className="text-sm text-red-600 ml-2">{result.error}</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inconsistencies List */}
      {inconsistencies.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Role Inconsistencies ({inconsistencies.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {inconsistencies.map((inconsistency) => (
                <div key={inconsistency.userId} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={getSeverityBadgeVariant(inconsistency.severity)}>
                          {getSeverityIcon(inconsistency.severity)}
                          {inconsistency.severity.toUpperCase()}
                        </Badge>
                        <span className="font-medium">{inconsistency.userEmail}</span>
                      </div>
                      
                      <div className="text-sm">
                        <strong>Current Role:</strong> {inconsistency.currentRole}
                        <br />
                        <strong>Expected Role:</strong> {inconsistency.expectedRole}
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        {inconsistency.reason}
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        Registered: {format(new Date(inconsistency.registrationDate), 'MMM dd, yyyy')}
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      onClick={() => fixSingleRole(inconsistency)}
                      disabled={fixing}
                    >
                      Fix Role
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">All Roles Consistent</h3>
              <p className="text-muted-foreground">
                No role inconsistencies detected. All users have the correct roles assigned.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Last Updated */}
      {report && (
        <div className="text-center text-sm text-muted-foreground">
          Last checked: {format(new Date(report.lastChecked), 'MMM dd, yyyy HH:mm:ss')}
        </div>
      )}
    </div>
  );
};

export default RoleConsistencyManager;