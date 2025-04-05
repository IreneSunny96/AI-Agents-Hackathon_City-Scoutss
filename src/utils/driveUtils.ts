
import { supabase } from '@/integrations/supabase/client';

export const downloadFileFromDrive = async (
  fileId: string,
  fileName: string,
  userId: string,
  accessToken: string
): Promise<{ path: string } | null> => {
  try {
    console.log(`Attempting to download file: ${fileName} (${fileId})`);
    
    // Fetch the file content from Google Drive
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to download file from Google Drive: ${response.status}`, errorText);
      throw new Error(`Failed to download file from Google Drive: ${response.status}`);
    }

    // Get the file content as blob first
    const fileBlob = await response.blob();
    
    // For JSON files, convert to text and then parse to validate
    let fileContent;
    if (fileName.endsWith('.json') || response.headers.get('content-type')?.includes('application/json')) {
      const fileText = await fileBlob.text();
      try {
        // Validate JSON structure
        fileContent = JSON.parse(fileText);
        // Convert back to properly formatted JSON string
        const jsonString = JSON.stringify(fileContent, null, 2);
        // Create a new blob with proper formatting
        const blob = new Blob([jsonString], { type: 'application/json' });
        
        // Create a unique path for the file in the storage bucket
        const filePath = `${userId}/${Date.now()}_${fileName}`;
        
        console.log(`Uploading file to Supabase Storage: ${filePath}`);
        
        // Upload the file to Supabase Storage
        const { data, error } = await supabase.storage
          .from('user_files')
          .upload(filePath, blob, {
            contentType: 'application/json',
            upsert: true,
          });

        if (error) {
          console.error('Error uploading file to storage:', error);
          throw error;
        }

        console.log('File successfully uploaded to Supabase:', data);
        // Return the file path in the storage bucket
        return data;
      } catch (parseError) {
        console.error('Error parsing JSON file:', parseError);
        throw new Error('The selected file is not a valid JSON file');
      }
    } else {
      // For non-JSON files, upload directly
      const filePath = `${userId}/${Date.now()}_${fileName}`;
      
      const { data, error } = await supabase.storage
        .from('user_files')
        .upload(filePath, fileBlob, {
          contentType: response.headers.get('content-type') || 'application/octet-stream',
          upsert: true,
        });

      if (error) {
        console.error('Error uploading file to storage:', error);
        throw error;
      }

      return data;
    }
  } catch (error) {
    console.error('Error downloading file from Drive:', error);
    return null;
  }
};

export const saveFileReference = async (
  userId: string,
  fileName: string,
  driveId: string,
  filePath: string | null
) => {
  try {
    console.log(`Saving file reference: ${fileName}, path: ${filePath}`);
    
    const { data, error } = await supabase
      .from('user_files')
      .insert({
        user_id: userId,
        file_name: fileName,
        original_drive_id: driveId,
        file_path: filePath,
        file_type: 'application/json',
        metadata: { source: 'google_drive' }
      });

    if (error) {
      console.error('Error saving file reference:', error);
      throw error;
    }

    console.log('File reference saved successfully', data);
    return data;
  } catch (error) {
    console.error('Error saving file reference:', error);
    return null;
  }
};
