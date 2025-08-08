import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRequest {
  userId: string;
  title: string;
  message: string;
  type?: 'general' | 'ticket' | 'payment' | 'kyc' | 'message';
  data?: Record<string, any>;
  sendEmail?: boolean;
  emailTemplate?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    const notificationRequest: NotificationRequest = await req.json()

    // Create notification in database
    const { data: notification, error: notificationError } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: notificationRequest.userId,
        title: notificationRequest.title,
        message: notificationRequest.message,
        type: notificationRequest.type || 'general',
        data: notificationRequest.data
      })
      .select()
      .single()

    if (notificationError) {
      throw new Error(`Notification creation failed: ${notificationError.message}`)
    }

    // Get user details for email
    const { data: user, error: userError } = await supabaseAdmin
      .from('profiles')
      .select('full_name, id')
      .eq('id', notificationRequest.userId)
      .single()

    if (userError) {
      console.error('User fetch failed:', userError)
    }

    // Get user email from auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(notificationRequest.userId)

    if (authError) {
      console.error('Auth user fetch failed:', authError)
    }

    // Send email notification if requested
    if (notificationRequest.sendEmail && authUser.user?.email) {
      try {
        const emailData = {
          name: user?.full_name || 'User',
          dashboardUrl: `${Deno.env.get('SITE_URL') || 'http://localhost:3000'}/dashboard`,
          ...notificationRequest.data
        }

        await supabaseAdmin.functions.invoke('send-email', {
          body: {
            to: authUser.user.email,
            subject: notificationRequest.title,
            template: notificationRequest.emailTemplate,
            templateData: emailData,
            html: notificationRequest.emailTemplate ? undefined : `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>${notificationRequest.title}</h2>
                <p>Hello ${user?.full_name || 'User'},</p>
                <p>${notificationRequest.message}</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${emailData.dashboardUrl}" 
                     style="background-color: #2563eb; color: white; padding: 12px 24px; 
                            text-decoration: none; border-radius: 6px; display: inline-block;">
                    Go to Dashboard
                  </a>
                </div>
                <p>Best regards,<br>Ticket Marketplace Team</p>
              </div>
            `
          }
        })
      } catch (emailError) {
        console.error('Email sending failed:', emailError)
        // Don't fail the notification if email fails
      }
    }

    // Send real-time notification via Supabase realtime
    const channel = supabaseAdmin.channel('notifications')
    channel.send({
      type: 'broadcast',
      event: 'new_notification',
      payload: {
        user_id: notificationRequest.userId,
        notification: notification
      }
    })

    return new Response(
      JSON.stringify({ 
        success: true,
        notification,
        message: 'Notification sent successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Notification function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})