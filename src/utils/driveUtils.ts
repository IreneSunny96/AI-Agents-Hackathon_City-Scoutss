
import { supabase } from '@/integrations/supabase/client';

export const downloadFileFromDrive = async (
  fileId: string,
  fileName: string,
  userId: string,
  accessToken: string
): Promise<{ path: string } | null> => {
  try {
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
      throw new Error('Failed to download file from Google Drive');
    }

    // Get the file content as JSON
    const fileContent = await response.json();
    
    // Convert JSON to blob
    const blob = new Blob([JSON.stringify(fileContent)], { type: 'application/json' });
    
    // Create a unique path for the file in the storage bucket
    const filePath = `${userId}/${Date.now()}_${fileName}`;
    
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

    // Return the file path in the storage bucket
    return data;
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

    return data;
  } catch (error) {
    console.error('Error saving file reference:', error);
    return null;
  }
};
