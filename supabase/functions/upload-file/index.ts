import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FileUploadRequest {
  bucket: string;
  fileName: string;
  fileData: string; // base64 encoded file data
  contentType: string;
  folder?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create Supabase client for user authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Get authenticated user
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('User not authenticated')
    }

    const uploadRequest: FileUploadRequest = await req.json()

    // Create admin client for file operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // Validate bucket
    const allowedBuckets = ['kyc-documents', 'ticket-images', 'avatars', 'message-attachments']
    if (!allowedBuckets.includes(uploadRequest.bucket)) {
      throw new Error('Invalid bucket specified')
    }

    // Convert base64 to Uint8Array
    const base64Data = uploadRequest.fileData.split(',')[1] || uploadRequest.fileData
    const fileBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))

    // Create file path with user ID
    const folder = uploadRequest.folder || user.id
    const filePath = `${folder}/${uploadRequest.fileName}`

    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(uploadRequest.bucket)
      .upload(filePath, fileBuffer, {
        contentType: uploadRequest.contentType,
        upsert: true
      })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    // Get public URL for the uploaded file
    const { data: urlData } = supabaseAdmin.storage
      .from(uploadRequest.bucket)
      .getPublicUrl(filePath)

    // Handle specific bucket logic
    switch (uploadRequest.bucket) {
      case 'kyc-documents':
        // Create KYC document record
        const documentType = uploadRequest.fileName.toLowerCase().includes('aadhar') ? 'aadhar' :
                            uploadRequest.fileName.toLowerCase().includes('pan') ? 'pan' :
                            uploadRequest.fileName.toLowerCase().includes('passport') ? 'passport' :
                            uploadRequest.fileName.toLowerCase().includes('license') ? 'driving_license' : 'aadhar'
        
        const { error: kycError } = await supabaseAdmin
          .from('kyc_documents')
          .insert({
            user_id: user.id,
            document_type: documentType,
            document_url: urlData.publicUrl,
            status: 'submitted'
          })

        if (kycError) {
          console.error('KYC document record creation failed:', kycError)
        }

        // Send notification to user
        await supabaseAdmin.rpc('create_notification', {
          p_user_id: user.id,
          p_title: 'KYC Document Uploaded',
          p_message: 'Your KYC document has been uploaded successfully and is under review.',
          p_type: 'kyc'
        })

        // Notify admins
        const { data: admins } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('user_type', 'admin')

        if (admins) {
          for (const admin of admins) {
            await supabaseAdmin.rpc('create_notification', {
              p_user_id: admin.id,
              p_title: 'New KYC Document Submitted',
              p_message: `A user has submitted a new ${documentType} document for verification.`,
              p_type: 'kyc',
              p_data: JSON.stringify({ user_id: user.id, document_type: documentType })
            })
          }
        }
        break

      case 'ticket-images':
        // The ticket record should be updated separately by the frontend
        break

      case 'avatars':
        // Update user profile with avatar URL
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({ avatar_url: urlData.publicUrl })
          .eq('id', user.id)

        if (profileError) {
          console.error('Profile avatar update failed:', profileError)
        }
        break
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        url: urlData.publicUrl,
        path: filePath,
        message: 'File uploaded successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('File upload error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})