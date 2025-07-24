// Expiry Warning Email Template for Invitation Approval Workflow
// This template is used to warn parents when their invitation token is about to expire

import type { ExpiryWarningEmailData } from '@/types/InvitationWorkflowTypes';

export function generateExpiryWarningEmailTemplate(data: ExpiryWarningEmailData) {
  const subject = `⏰ Your Flying Bus invitation expires soon - Action needed`;
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invitation Expiring Soon - The Flying Bus</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 0;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">⏰ Time-Sensitive Notice</h1>
          <p style="color: #fef3c7; margin: 10px 0 0 0; font-size: 16px;">Your Flying Bus invitation is expiring soon</p>
        </div>
        
        <!-- Main Content -->
        <div style="padding: 40px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background-color: #f59e0b; color: white; display: inline-block; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; margin-bottom: 20px;">
              ⚠️ EXPIRING SOON
            </div>
            <h2 style="color: #1f2937; margin: 0; font-size: 24px;">Don't Miss Out!</h2>
          </div>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Dear ${data.parentName},
          </p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            This is a friendly reminder that your invitation for <strong style="color: #f59e0b;">${data.childName}</strong> 
            to join The Flying Bus will expire on <strong style="color: #dc2626;">${data.expiresAt}</strong>.
          </p>
          
          <!-- Urgent Action Section -->
          <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 30px; border-radius: 12px; margin: 30px 0; border: 2px solid #f59e0b;">
            <div style="text-align: center;">
              <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 22px;">🚨 Action Required</h3>
              <p style="color: #92400e; margin-bottom: 20px; font-size: 16px; line-height: 1.6;">
                To secure <strong>${data.childName}'s</strong> spot as a young journalist, please complete the account setup process before the expiration date.
              </p>
              <div style="background-color: #dc2626; color: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; font-size: 18px; font-weight: bold;">
                  ⏰ Time Remaining: Until ${data.expiresAt}
                </p>
              </div>
            </div>
          </div>
          
          <!-- What Happens Next -->
          <div style="background-color: #f3f4f6; padding: 25px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #6b7280;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">📋 What Happens After Expiry?</h3>
            <p style="color: #4b5563; margin-bottom: 15px; font-size: 16px; line-height: 1.6;">
              If the invitation expires, you'll need to submit a new invitation request and go through the approval process again.
            </p>
            <p style="color: #4b5563; margin: 0; font-size: 16px; line-height: 1.6; font-weight: 600;">
              We encourage you to complete the process now to avoid any delays in ${data.childName}'s journey as a young journalist.
            </p>
          </div>
          
          <!-- Help Section -->
          <div style="background-color: #f0f9ff; padding: 25px; border-radius: 8px; margin: 30px 0; border: 1px solid #0ea5e9;">
            <h3 style="color: #0c4a6e; margin: 0 0 15px 0; font-size: 18px;">🆘 Need Help?</h3>
            <p style="color: #0c4a6e; margin-bottom: 15px; font-size: 16px; line-height: 1.6;">
              If you're having trouble with the invitation process or need assistance, we're here to help!
            </p>
            <div style="background-color: white; padding: 20px; border-radius: 6px; text-align: center;">
              <p style="color: #0c4a6e; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">
                Contact our support team:
              </p>
              <p style="margin: 0;">
                <a href="mailto:${data.supportEmail}" 
                   style="color: #2563eb; text-decoration: none; font-weight: bold; font-size: 16px;">
                  ${data.supportEmail}
                </a>
              </p>
              <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 13px;">
                We typically respond within 4 hours for urgent requests
              </p>
            </div>
          </div>
          
          <!-- Common Issues -->
          <div style="margin: 40px 0;">
            <h3 style="color: #1f2937; font-size: 20px; margin-bottom: 20px;">🔧 Common Issues & Solutions</h3>
            <div style="space-y: 15px;">
              <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; border-left: 3px solid #2563eb; margin-bottom: 15px;">
                <h4 style="color: #2563eb; margin: 0 0 8px 0; font-size: 16px;">Can't find the invitation email?</h4>
                <p style="color: #4b5563; margin: 0; font-size: 14px;">Check your spam/junk folder and search for "Flying Bus"</p>
              </div>
              <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; border-left: 3px solid #10b981; margin-bottom: 15px;">
                <h4 style="color: #10b981; margin: 0 0 8px 0; font-size: 16px;">Link not working?</h4>
                <p style="color: #4b5563; margin: 0; font-size: 14px;">Try copying and pasting the full URL into your browser</p>
              </div>
              <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; border-left: 3px solid #f59e0b;">
                <h4 style="color: #f59e0b; margin: 0 0 8px 0; font-size: 16px;">Technical difficulties?</h4>
                <p style="color: #4b5563; margin: 0; font-size: 14px;">Contact our support team immediately - we can extend your deadline</p>
              </div>
            </div>
          </div>
          
          <!-- Encouragement -->
          <div style="text-align: center; background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); padding: 30px; border-radius: 12px; margin: 30px 0; border: 1px solid #10b981;">
            <h3 style="color: #065f46; margin: 0 0 15px 0; font-size: 20px;">🌟 We're Excited to Welcome ${data.childName}!</h3>
            <p style="color: #065f46; margin: 0; font-size: 16px; line-height: 1.6;">
              The Flying Bus community is eager to read ${data.childName}'s stories and perspectives. 
              Don't let this opportunity slip away - complete the setup today!
            </p>
          </div>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 10px;">
            We look forward to welcoming ${data.childName} to our community of young journalists!
          </p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 10px;">
            Best regards,
          </p>
          <p style="color: #2563eb; font-size: 16px; font-weight: 600; margin: 0;">
            The Flying Bus Team
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f3f4f6; padding: 20px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; margin: 0; font-size: 12px;">
            © 2025 The Flying Bus. All rights reserved.
          </p>
          <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 12px;">
            This reminder was sent regarding ${data.childName}'s invitation expiring on ${data.expiresAt}.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
    ⏰ TIME-SENSITIVE NOTICE - THE FLYING BUS
    ========================================
    
    Dear ${data.parentName},
    
    This is a friendly reminder that your invitation for ${data.childName} to join 
    The Flying Bus will expire on ${data.expiresAt}.
    
    🚨 ACTION REQUIRED:
    ------------------
    To secure ${data.childName}'s spot as a young journalist, please complete the 
    account setup process before the expiration date.
    
    ⏰ TIME REMAINING: Until ${data.expiresAt}
    
    📋 WHAT HAPPENS AFTER EXPIRY?
    -----------------------------
    If the invitation expires, you'll need to submit a new invitation request and 
    go through the approval process again. We encourage you to complete the process 
    now to avoid any delays.
    
    🆘 NEED HELP?
    ------------
    If you're having trouble with the invitation process, contact our support team:
    ${data.supportEmail}
    (We typically respond within 4 hours for urgent requests)
    
    🔧 COMMON ISSUES & SOLUTIONS:
    ----------------------------
    • Can't find the invitation email? Check your spam/junk folder
    • Link not working? Try copying the full URL into your browser
    • Technical difficulties? Contact support immediately - we can extend your deadline
    
    🌟 WE'RE EXCITED TO WELCOME ${data.childName.toUpperCase()}!
    --------------------------------------------------------
    The Flying Bus community is eager to read ${data.childName}'s stories and perspectives. 
    Don't let this opportunity slip away - complete the setup today!
    
    We look forward to welcoming ${data.childName} to our community of young journalists!
    
    Best regards,
    The Flying Bus Team
    
    ---
    © 2025 The Flying Bus. All rights reserved.
    This reminder was sent regarding ${data.childName}'s invitation expiring on ${data.expiresAt}.
  `;
  
  return { subject, html, text };
}