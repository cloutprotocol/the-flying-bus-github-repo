// Denial Email Template for Invitation Approval Workflow
// This template is used when an admin denies a parent's invitation request

import type { DenialEmailData } from '@/types/InvitationWorkflowTypes';

export function generateDenialEmailTemplate(data: DenialEmailData) {
  const subject = `Update on your Flying Bus invitation request`;
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invitation Update - The Flying Bus</title>
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
            <div style="background-color: #f59e0b; color: white; display: inline-block; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; margin-bottom: 20px;">
              📋 UPDATE
            </div>
            <h2 style="color: #1f2937; margin: 0; font-size: 24px;">Invitation Request Update</h2>
          </div>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Dear ${data.parentName},
          </p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Thank you for your interest in having <strong style="color: #2563eb;">${data.childName}</strong> join The Flying Bus as a young journalist.
          </p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            After careful review, we're unable to approve the invitation request at this time. 
            ${data.reason ? `Here's why: <em>${data.reason}</em>` : 'This decision is based on our current capacity and program requirements.'}
          </p>
          
          <!-- What's Next Section -->
          <div style="background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); padding: 30px; border-radius: 12px; margin: 30px 0; border: 1px solid #d1d5db;">
            <h3 style="color: #1f2937; margin: 0 0 20px 0; font-size: 20px;">What's Next?</h3>
            <p style="color: #4b5563; margin-bottom: 15px; font-size: 16px; line-height: 1.6;">
              You're welcome to reapply in the future when circumstances change. We encourage you to:
            </p>
            <ul style="color: #4b5563; font-size: 16px; line-height: 1.8; margin: 0; padding-left: 20px;">
              <li>Check our website for updated program information</li>
              <li>Consider having ${data.childName} practice writing skills</li>
              <li>Stay connected with our community updates</li>
              <li>Review our submission guidelines for future applications</li>
            </ul>
          </div>
          
          <!-- Encouragement Section -->
          <div style="background-color: #f0f9ff; padding: 25px; border-radius: 8px; margin: 30px 0; border: 1px solid #0ea5e9;">
            <h4 style="color: #0c4a6e; margin: 0 0 15px 0; font-size: 18px;">🌟 Keep Writing!</h4>
            <p style="color: #0c4a6e; margin: 0; font-size: 15px; line-height: 1.6;">
              We appreciate ${data.childName}'s interest in journalism. Encourage them to keep writing, reading, and developing their skills. 
              The world needs young voices like theirs!
            </p>
          </div>
          
          <!-- Resources Section -->
          <div style="margin: 40px 0;">
            <h3 style="color: #1f2937; font-size: 20px; margin-bottom: 20px;">Resources for Young Writers</h3>
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
              While ${data.childName} continues to develop their writing skills, here are some helpful resources:
            </p>
            <ul style="color: #374151; font-size: 16px; line-height: 1.8; padding-left: 20px;">
              <li>Local library writing programs and workshops</li>
              <li>School newspaper or journalism clubs</li>
              <li>Online writing communities for young people</li>
              <li>Reading age-appropriate news sources together</li>
            </ul>
          </div>
          
          <!-- Reapplication Info -->
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 30px 0; border-radius: 0 8px 8px 0;">
            <h4 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">
              💡 Future Applications
            </h4>
            <p style="color: #92400e; margin: 0; font-size: 14px; line-height: 1.6;">
              We periodically review our program capacity and requirements. Feel free to reapply in the future 
              as ${data.childName} continues to grow and develop their writing abilities.
            </p>
          </div>
          
          <!-- Support -->
          <div style="text-align: center; margin: 40px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
            <p style="color: #6b7280; margin: 0; font-size: 14px;">
              Questions about this decision or our program? Contact us at 
              <a href="mailto:support@flyingbus.com" style="color: #2563eb; text-decoration: none;">support@flyingbus.com</a>
            </p>
          </div>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 10px;">
            We appreciate your understanding and ${data.childName}'s interest in journalism. Please don't hesitate to reach out if you have any questions.
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
            This email was sent regarding your invitation request for ${data.childName}.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
    THE FLYING BUS - INVITATION REQUEST UPDATE
    ==========================================
    
    Dear ${data.parentName},
    
    Thank you for your interest in having ${data.childName} join The Flying Bus as a young journalist.
    
    After careful review, we're unable to approve the invitation request at this time. 
    ${data.reason ? `Here's why: ${data.reason}` : 'This decision is based on our current capacity and program requirements.'}
    
    WHAT'S NEXT?
    -----------
    You're welcome to reapply in the future when circumstances change. We encourage you to:
    • Check our website for updated program information
    • Consider having ${data.childName} practice writing skills
    • Stay connected with our community updates
    • Review our submission guidelines for future applications
    
    KEEP WRITING!
    ------------
    We appreciate ${data.childName}'s interest in journalism. Encourage them to keep writing, 
    reading, and developing their skills. The world needs young voices like theirs!
    
    RESOURCES FOR YOUNG WRITERS:
    ---------------------------
    • Local library writing programs and workshops
    • School newspaper or journalism clubs
    • Online writing communities for young people
    • Reading age-appropriate news sources together
    
    FUTURE APPLICATIONS:
    -------------------
    We periodically review our program capacity and requirements. Feel free to reapply 
    in the future as ${data.childName} continues to grow and develop their writing abilities.
    
    SUPPORT:
    -------
    Questions about this decision or our program? Contact us at support@flyingbus.com
    
    We appreciate your understanding and ${data.childName}'s interest in journalism.
    
    Best regards,
    The Flying Bus Team
    
    ---
    © 2025 The Flying Bus. All rights reserved.
    This email was sent regarding your invitation request for ${data.childName}.
  `;
  
  return { subject, html, text };
}