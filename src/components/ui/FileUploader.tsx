
import React, { useState, useRef } from 'react';
import { Button } from './button';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface FileUploaderProps {
  userId: string;
  onFileUploaded?: (filePath: string) => void;
  accept?: string;
  disabled?: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  userId,
  onFileUploaded,
  accept = ".json",
  disabled = false
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const validateFile = (file: File): boolean => {
    // Validate file type
    if (accept === '.json' && file.type !== 'application/json') {
      try {
        // Try to parse the file to see if it's a JSON
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            JSON.parse(e.target?.result as string);
            return true;
          } catch (error) {
            toast.error('The selected file is not a valid JSON file');
            return false;
          }
        };
        reader.readAsText(file);
      } catch (error) {
        toast.error('The selected file is not a valid JSON file');
        return false;
      }
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return false;
    }

    return true;
  };

  const uploadFile = async () => {
    if (!selectedFile || !userId) return;
    
    if (!validateFile(selectedFile)) {
      return;
    }

    try {
      setIsUploading(true);
      
      // Create a unique file path
      const filePath = `${userId}/${Date.now()}_${selectedFile.name}`;
      
      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from('user_files')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (error) {
        throw error;
      }
      
      // Save file reference to database
      const { error: dbError } = await supabase
        .from('user_files')
        .insert({
          user_id: userId,
          file_name: selectedFile.name,
          file_path: data?.path || filePath,
          file_type: selectedFile.type,
          metadata: { source: 'manual_upload' }
        });
      
      if (dbError) {
        throw dbError;
      }
      
      toast.success('File uploaded successfully');
      
      if (onFileUploaded && data) {
        onFileUploaded(data.path);
      }
      
      // Reset file selection
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
      />
      
      <div className="flex flex-col space-y-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleUploadClick}
          disabled={disabled || isUploading}
          className="w-full py-6 border-dashed border-2"
        >
          <Upload className="mr-2 h-4 w-4" />
          {isUploading ? 'Uploading...' : 'Select File'}
        </Button>
        
        {selectedFile && (
          <div className="flex flex-col space-y-2">
            <div className="bg-muted/50 p-2 rounded-md text-sm">
              Selected: <span className="font-medium">{selectedFile.name}</span>
            </div>
            
            <Button
              type="button"
              onClick={uploadFile}
              disabled={disabled || isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Uploading...
                </>
              ) : 'Upload File'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploader;
