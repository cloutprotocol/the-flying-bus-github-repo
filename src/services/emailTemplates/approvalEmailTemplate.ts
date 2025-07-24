// Approval Email Template for Invitation Approval Workflow
// This template is used when an admin approves a parent's invitation request

import type { ApprovalEmailData } from '@/types/InvitationWorkflowTypes';

export function generateApprovalEmailTemplate(data: ApprovalEmailData) {
  const subject = `Great News! ${data.childName} has been approved for The Flying Bus`;
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invitation Approved - The Flying Bus</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 0;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">The Flying Bus</h1>
          <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">News for Kids, By Kids</p>
        </div>
        
        <!-- Main Content -->
        <div style="padding: 40px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background-color: #10b981; color: white; display: inline-block; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; margin-bottom: 20px;">
              ✅ APPROVED
            </div>
            <h2 style="color: #1f2937; margin: 0; font-size: 24px;">Welcome to The Flying Bus!</h2>
          </div>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Dear ${data.parentName},
          </p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            We're excited to let you know that <strong style="color: #2563eb;">${data.childName}</strong> has been approved to become a young journalist on The Flying Bus platform!
          </p>
          
          <!-- Call to Action Box -->
          <div style="background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); padding: 30px; border-radius: 12px; margin: 30px 0; text-align: center; border: 1px solid #d1d5db;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 20px;">Next Steps</h3>
            <p style="color: #4b5563; margin-bottom: 25px; font-size: 16px;">
              Click the button below to create ${data.childName}'s author account:
            </p>
            <a href="${data.invitationUrl}" 
               style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);">
              Create Account Now
            </a>
          </div>
          
          <!-- Important Notice -->
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0;">
            <p style="color: #92400e; margin: 0; font-size: 16px; font-weight: 600;">
              ⏰ Important: This invitation link will expire on ${data.expiresAt}
            </p>
            <p style="color: #92400e; margin: 10px 0 0 0; font-size: 14px;">
              Please complete the account setup before then to secure ${data.childName}'s spot.
            </p>
          </div>
          
          <!-- About Section -->
          <div style="margin: 40px 0;">
            <h3 style="color: #1f2937; font-size: 20px; margin-bottom: 20px;">About The Flying Bus</h3>
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
              The Flying Bus is a safe, moderated platform where children can:
            </p>
            <ul style="color: #374151; font-size: 16px; line-height: 1.8; padding-left: 20px;">
              <li>Write and publish news articles</li>
              <li>Share their perspectives on current events</li>
              <li>Learn journalism skills from experienced mentors</li>
              <li>Connect with other young writers in a safe environment</li>
              <li>Develop critical thinking and communication skills</li>
            </ul>
          </div>
          
          <!-- Safety Section -->
          <div style="background-color: #f0f9ff; padding: 25px; border-radius: 8px; margin: 30px 0; border: 1px solid #0ea5e9;">
            <h4 style="color: #0c4a6e; margin: 0 0 15px 0; font-size: 18px;">🛡️ Safety First</h4>
            <p style="color: #0c4a6e; margin: 0; font-size: 15px; line-height: 1.6;">
              We're committed to providing a safe environment with comprehensive moderation, age-appropriate content guidelines, and parental oversight tools.
            </p>
          </div>
          
          <!-- Support -->
          <div style="text-align: center; margin: 40px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
            <p style="color: #6b7280; margin: 0; font-size: 14px;">
              Questions? Contact our support team at 
              <a href="mailto:support@flyingbus.com" style="color: #2563eb; text-decoration: none;">support@flyingbus.com</a>
            </p>
          </div>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 10px;">
            Welcome to the community!
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
            This email was sent regarding your invitation request for ${data.childName}.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
    THE FLYING BUS - INVITATION APPROVED
    ====================================
    
    Dear ${data.parentName},
    
    Great news! ${data.childName} has been approved to become a young journalist on The Flying Bus platform!
    
    NEXT STEPS:
    -----------
    Please visit the following link to create ${data.childName}'s author account:
    ${data.invitationUrl}
    
    IMPORTANT: This invitation link will expire on ${data.expiresAt}. 
    Please complete the account setup before then to secure ${data.childName}'s spot.
    
    ABOUT THE FLYING BUS:
    --------------------
    The Flying Bus is a safe, moderated platform where children can:
    • Write and publish news articles
    • Share their perspectives on current events  
    • Learn journalism skills from experienced mentors
    • Connect with other young writers in a safe environment
    • Develop critical thinking and communication skills
    
    SAFETY FIRST:
    ------------
    We're committed to providing a safe environment with comprehensive moderation, 
    age-appropriate content guidelines, and parental oversight tools.
    
    SUPPORT:
    -------
    If you have any questions, please contact our support team at support@flyingbus.com
    
    Welcome to the community!
    The Flying Bus Team
    
    ---
    © 2025 The Flying Bus. All rights reserved.
    This email was sent regarding your invitation request for ${data.childName}.
  `;
  
  return { subject, html, text };
}