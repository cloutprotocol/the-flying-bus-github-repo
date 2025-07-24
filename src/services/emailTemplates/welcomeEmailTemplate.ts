// Welcome Email Template for Invitation Approval Workflow
// This template is used after a parent successfully creates an account for their child

import type { WelcomeEmailData } from '@/types/InvitationWorkflowTypes';

export function generateWelcomeEmailTemplate(data: WelcomeEmailData) {
  const subject = `Welcome to The Flying Bus Author Community!`;
  
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome - The Flying Bus</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 0;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px 40px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🎉 Welcome to The Flying Bus!</h1>
          <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 16px;">Your journey as a young journalist begins now</p>
        </div>
        
        <!-- Main Content -->
        <div style="padding: 40px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background-color: #10b981; color: white; display: inline-block; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; margin-bottom: 20px;">
              ✅ ACCOUNT CREATED
            </div>
            <h2 style="color: #1f2937; margin: 0; font-size: 24px;">Congratulations!</h2>
          </div>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Dear ${data.parentName},
          </p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            Congratulations! <strong style="color: #10b981;">${data.childName}'s</strong> author account has been successfully created. 
            They're now part of The Flying Bus community of young journalists!
          </p>
          
          <!-- Getting Started Section -->
          <div style="background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); padding: 30px; border-radius: 12px; margin: 30px 0; border: 1px solid #d1d5db;">
            <h3 style="color: #1f2937; margin: 0 0 20px 0; font-size: 20px;">🚀 Getting Started</h3>
            <p style="color: #4b5563; margin-bottom: 15px; font-size: 16px;">
              Here's what ${data.childName} can do now:
            </p>
            <ul style="color: #4b5563; font-size: 16px; line-height: 1.8; margin: 0 0 20px 0; padding-left: 20px;">
              <li>Log in to their account at <a href="${data.platformUrl}" style="color: #2563eb; text-decoration: none;">${data.platformUrl}</a></li>
              <li>Complete their profile with interests and bio</li>
              <li>Start writing their first article</li>
              <li>Explore articles by other young journalists</li>
              <li>Join discussions in the comments</li>
            </ul>
            <div style="text-align: center;">
              <a href="${data.platformUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Visit The Flying Bus
              </a>
            </div>
          </div>
          
          <!-- Safety Information -->
          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 25px; margin: 30px 0; border-radius: 0 8px 8px 0;">
            <h3 style="color: #dc2626; margin: 0 0 15px 0; font-size: 18px;">🛡️ Important Safety Information</h3>
            <p style="color: #dc2626; margin-bottom: 15px; font-size: 16px; font-weight: 600;">
              Please review our <a href="${data.guidelinesUrl}" style="color: #dc2626; text-decoration: underline;">Community Guidelines</a> with ${data.childName}.
            </p>
            <p style="color: #7f1d1d; margin-bottom: 10px; font-size: 15px; font-weight: 600;">Key safety points:</p>
            <ul style="color: #7f1d1d; font-size: 15px; line-height: 1.6; margin: 0; padding-left: 20px;">
              <li><strong>All content is moderated</strong> before publication</li>
              <li><strong>Never share personal information</strong> (address, phone, school name)</li>
              <li><strong>Respectful communication</strong> is required at all times</li>
              <li><strong>Age-appropriate content only</strong> - no mature topics</li>
              <li><strong>Report any concerns</strong> to our moderation team immediately</li>
            </ul>
          </div>
          
          <!-- Parental Oversight -->
          <div style="background-color: #f0f9ff; padding: 25px; border-radius: 8px; margin: 30px 0; border: 1px solid #0ea5e9;">
            <h3 style="color: #0c4a6e; margin: 0 0 15px 0; font-size: 18px;">👨‍👩‍👧‍👦 Parental Oversight</h3>
            <p style="color: #0c4a6e; margin-bottom: 15px; font-size: 16px;">
              As a parent, you have several tools to ensure ${data.childName}'s safety:
            </p>
            <ul style="color: #0c4a6e; font-size: 15px; line-height: 1.6; margin: 0; padding-left: 20px;">
              <li>Monitor ${data.childName}'s activity and published articles</li>
              <li>Contact our moderation team with any concerns</li>
              <li>Access safety resources and parenting tips</li>
              <li>Receive notifications about ${data.childName}'s account activity</li>
              <li>Request account suspension or deletion at any time</li>
            </ul>
          </div>
          
          <!-- Writing Tips -->
          <div style="margin: 40px 0;">
            <h3 style="color: #1f2937; font-size: 20px; margin-bottom: 20px;">✍️ Tips for Young Journalists</h3>
            <div style="display: grid; gap: 15px;">
              <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; border-left: 3px solid #2563eb;">
                <h4 style="color: #2563eb; margin: 0 0 8px 0; font-size: 16px;">Start Small</h4>
                <p style="color: #4b5563; margin: 0; font-size: 14px;">Begin with topics you're passionate about or events in your school or community.</p>
              </div>
              <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; border-left: 3px solid #10b981;">
                <h4 style="color: #10b981; margin: 0 0 8px 0; font-size: 16px;">Ask Questions</h4>
                <p style="color: #4b5563; margin: 0; font-size: 14px;">Good journalists are curious. Always ask who, what, when, where, why, and how.</p>
              </div>
              <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; border-left: 3px solid #f59e0b;">
                <h4 style="color: #f59e0b; margin: 0 0 8px 0; font-size: 16px;">Be Respectful</h4>
                <p style="color: #4b5563; margin: 0; font-size: 14px;">Always treat your subjects and readers with respect and kindness.</p>
              </div>
            </div>
          </div>
          
          <!-- Contact Information -->
          <div style="background-color: #f3f4f6; padding: 25px; border-radius: 8px; margin: 30px 0; text-align: center;">
            <h4 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">📞 Need Help?</h4>
            <p style="color: #4b5563; margin: 0 0 10px 0; font-size: 15px;">
              Our support team is here to help with any questions or concerns:
            </p>
            <p style="margin: 0;">
              <a href="mailto:support@flyingbus.com" style="color: #2563eb; text-decoration: none; font-weight: 600;">support@flyingbus.com</a>
            </p>
            <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 13px;">
              We typically respond within 24 hours
            </p>
          </div>
          
          <div style="text-align: center; margin: 40px 0;">
            <p style="color: #374151; font-size: 18px; line-height: 1.6; margin-bottom: 10px; font-weight: 600;">
              We're excited to see what stories ${data.childName} will share with our community!
            </p>
            <p style="color: #10b981; font-size: 20px; font-weight: bold; margin: 0;">
              Happy writing! 📝✨
            </p>
          </div>
          
          <p style="color: #2563eb; font-size: 16px; font-weight: 600; margin: 0; text-align: center;">
            The Flying Bus Team
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f3f4f6; padding: 20px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; margin: 0; font-size: 12px;">
            © 2025 The Flying Bus. All rights reserved.
          </p>
          <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 12px;">
            This welcome email was sent for ${data.childName}'s new author account.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  const text = `
    🎉 WELCOME TO THE FLYING BUS! 🎉
    ===============================
    
    Dear ${data.parentName},
    
    Congratulations! ${data.childName}'s author account has been successfully created. 
    They're now part of The Flying Bus community of young journalists!
    
    🚀 GETTING STARTED:
    ------------------
    Here's what ${data.childName} can do now:
    • Log in to their account at ${data.platformUrl}
    • Complete their profile with interests and bio
    • Start writing their first article
    • Explore articles by other young journalists
    • Join discussions in the comments
    
    🛡️ IMPORTANT SAFETY INFORMATION:
    --------------------------------
    Please review our Community Guidelines at ${data.guidelinesUrl} with ${data.childName}.
    
    Key safety points:
    • All content is moderated before publication
    • Never share personal information (address, phone, school name)
    • Respectful communication is required at all times
    • Age-appropriate content only - no mature topics
    • Report any concerns to our moderation team immediately
    
    👨‍👩‍👧‍👦 PARENTAL OVERSIGHT:
    ---------------------------
    As a parent, you can:
    • Monitor ${data.childName}'s activity and published articles
    • Contact our moderation team with any concerns
    • Access safety resources and parenting tips
    • Receive notifications about ${data.childName}'s account activity
    • Request account suspension or deletion at any time
    
    ✍️ TIPS FOR YOUNG JOURNALISTS:
    ------------------------------
    • Start Small: Begin with topics you're passionate about
    • Ask Questions: Good journalists are curious (who, what, when, where, why, how)
    • Be Respectful: Always treat subjects and readers with respect and kindness
    
    📞 NEED HELP?
    ------------
    Our support team is here to help: support@flyingbus.com
    (We typically respond within 24 hours)
    
    We're excited to see what stories ${data.childName} will share with our community!
    
    Happy writing! 📝✨
    The Flying Bus Team
    
    ---
    © 2025 The Flying Bus. All rights reserved.
    This welcome email was sent for ${data.childName}'s new author account.
  `;
  
  return { subject, html, text };
}