import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";
import jsPDF from "https://esm.sh/jspdf@3.0.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JournalEntry {
  id: number;
  content: string;
  received_at: string;
  category?: string;
}

interface UserData {
  id: string;
  email: string;
  name?: string;
}

function sanitizeFilename(email: string): string {
  return email
    .toLowerCase()
    .replace(/@/g, '_at_')
    .replace(/[^a-z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { 
    month: "long", 
    day: "numeric", 
    year: "numeric" 
  }).format(date);
}

function generateBasicPDF(user: UserData, entries: JournalEntry[], dateEnd: string): Uint8Array {
  const doc = new jsPDF();
  
  // Title page
  doc.setFontSize(24);
  doc.text(`${user.name || 'Legacy Journal'}`, 20, 30);
  
  doc.setFontSize(16);
  doc.text("Legacy Journal", 20, 50);
  
  doc.setFontSize(12);
  const endDate = new Date(dateEnd);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 7);
  
  doc.text(`Entries: ${formatLongDate(startDate)} – ${formatLongDate(endDate)}`, 20, 70);
  doc.text(`Generated on ${formatLongDate(new Date())}`, 20, 90);
  
  // Journal entries
  entries.forEach((entry, index) => {
    doc.addPage();
    
    // Entry date header
    doc.setFontSize(14);
    const entryDate = new Date(entry.received_at);
    doc.text(formatLongDate(entryDate), 20, 30);
    
    // Entry content
    doc.setFontSize(12);
    const splitText = doc.splitTextToSize(entry.content, 170);
    doc.text(splitText, 20, 50);
    
    // Add category if available
    if (entry.category) {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Category: ${entry.category}`, 20, doc.internal.pageSize.height - 20);
      doc.setTextColor(0, 0, 0); // Reset to black
    }
  });
  
  return new Uint8Array(doc.output('arraybuffer'));
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Admin-only endpoint - verify JWT authentication and admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('❌ Missing authorization header');
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize Supabase clients
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify user authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('❌ Invalid authentication:', authError);
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify admin role using security definer function
    const { data: isAdmin, error: roleError } = await supabase
      .rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });

    if (roleError || !isAdmin) {
      console.error('❌ Admin check failed:', roleError);
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`✅ Admin user ${user.email} authenticated for export operation`);

    // Parse query parameters
    const url = new URL(req.url);
    const range = url.searchParams.get('range') || 'week';
    const dateEndParam = url.searchParams.get('date_end');
    const filter = url.searchParams.get('filter');
    const test = url.searchParams.get('test') === 'true';
    
    const dateEnd = dateEndParam || new Date().toISOString().split('T')[0];
    const endDate = new Date(dateEnd);
    
    let startDate: Date | null = null;
    if (range === 'week') {
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 7);
    }

    // Ensure bucket exists
    const bucketName = 'weekly_exports';
    const { error: bucketError } = await supabase.storage.getBucket(bucketName);
    if (bucketError) {
      console.log('Creating bucket:', bucketName);
      await supabase.storage.createBucket(bucketName, { public: false });
    }

    // Fetch users
    let usersQuery = supabase
      .from('users_app')
      .select('id, email, name')
      .eq('status', 'active')
      .not('email', 'is', null);

    if (filter) {
      const filterEmails = filter.split(',').map(e => e.trim());
      usersQuery = usersQuery.in('email', filterEmails);
    }

    if (test) {
      usersQuery = usersQuery.limit(3);
    }

    const { data: users, error: usersError } = await usersQuery;
    
    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ 
          ok: true, 
          message: 'No users found',
          processed_users: 0,
          pdf_count: 0 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create ZIP and process users
    const zip = new JSZip();
    const folderPath = `${dateEnd}`;
    let processedUsers = 0;
    let skippedNoEntries = 0;
    let pdfCount = 0;
    const samples: any[] = [];

    for (const user of users) {
      // Fetch entries for this user
      let entriesQuery = supabase
        .from('journal_entries')
        .select('id, content, received_at, category')
        .eq('user_id', user.id)
        .order('received_at', { ascending: true });

      if (startDate) {
        entriesQuery = entriesQuery
          .gte('received_at', startDate.toISOString())
          .lte('received_at', endDate.toISOString());
      }

      const { data: entries, error: entriesError } = await entriesQuery;
      
      if (entriesError) {
        console.error(`Error fetching entries for user ${user.id}:`, entriesError);
        continue;
      }

      if (!entries || entries.length === 0) {
        skippedNoEntries++;
        continue;
      }

      // Generate PDF
      const pdfBuffer = generateBasicPDF(user, entries, dateEnd);
      const sanitizedEmail = sanitizeFilename(user.email);
      const filename = `${sanitizedEmail}_${dateEnd}.pdf`;
      const storagePath = `${folderPath}/${filename}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(storagePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) {
        console.error(`Error uploading PDF for ${user.email}:`, uploadError);
        continue;
      }

      // Add to ZIP
      zip.file(filename, pdfBuffer);

      processedUsers++;
      pdfCount++;

      // Add to samples (first 3)
      if (samples.length < 3) {
        samples.push({
          email: user.email,
          pdf_key: `${bucketName}/${storagePath}`
        });
      }

      console.log(JSON.stringify({
        user_id: user.id,
        email: user.email,
        entries: entries.length,
        pdf_bytes: pdfBuffer.length
      }));
    }

    // Create and upload ZIP
    const zipBuffer = await zip.generateAsync({ type: "uint8array" });
    const zipFilename = `legacy-journals_${dateEnd}.zip`;
    const zipPath = `${folderPath}/${zipFilename}`;
    
    const { error: zipUploadError } = await supabase.storage
      .from(bucketName)
      .upload(zipPath, zipBuffer, {
        contentType: 'application/zip',
        upsert: true
      });

    if (zipUploadError) {
      throw new Error(`Failed to upload ZIP: ${zipUploadError.message}`);
    }

    // Generate signed URL for ZIP
    const { data: zipSignedData, error: zipSignedError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(zipPath, 86400); // 24 hours

    if (zipSignedError) {
      throw new Error(`Failed to create signed URL: ${zipSignedError.message}`);
    }

    const response = {
      ok: true,
      range,
      date_end: dateEnd,
      processed_users: processedUsers,
      skipped_no_entries: skippedNoEntries,
      pdf_count: pdfCount,
      zip_key: `${bucketName}/${zipPath}`,
      zip_url: zipSignedData.signedUrl,
      folder_hint: `${bucketName}/${folderPath}/`,
      samples
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error: any) {
    console.error('Error in export-all-pdfs function:', error);
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);