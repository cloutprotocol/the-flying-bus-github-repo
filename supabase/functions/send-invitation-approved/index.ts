import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface InvitationApprovedRequest {
  invitationId: string
  parentEmail: string
  parentName: string
  childName: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse request body
    const { invitationId, parentEmail, parentName, childName }: InvitationApprovedRequest = await req.json()

    // Validate required fields
    if (!invitationId || !parentEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: invitationId, parentEmail' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Step 1: Create activation URL (simplified - no token for now)
    const baseUrl = Deno.env.get('SITE_URL') || 'https://localhost:3000'
    const activationUrl = `${baseUrl}/invitation/activate?id=${encodeURIComponent(invitationId)}&email=${encodeURIComponent(parentEmail)}`
    
    // Calculate expiration date
    const expirationDate = new Date()
    expirationDate.setDate(expirationDate.getDate() + 7)

    // Step 2: Send invitation email
    console.log('Sending invitation email to:', parentEmail)
    
    const emailResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        type: 'invitation_approved',
        to: parentEmail,
        templateData: {
          parentName: parentName || 'Parent',
          childName: childName || 'Child',
          activationUrl: activationUrl,
          expirationDate: expirationDate.toLocaleDateString()
        }
      })
    })

    if (!emailResponse.ok) {
      throw new Error(`Email sending failed: ${emailResponse.status}`)
    }

    const emailResult = await emailResponse.json()
    
    if (!emailResult.success) {
      throw new Error(`Email sending error: ${emailResult.error}`)
    }

    console.log('Successfully sent invitation email with token')

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: emailResult.messageId,
        emailSent: true
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in send-invitation-approved:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})