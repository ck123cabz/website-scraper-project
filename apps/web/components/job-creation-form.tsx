'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Link, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function JobCreationForm({ onClose }: { onClose?: () => void }) {
  const router = useRouter();
  const [jobName, setJobName] = useState('');
  const [urls, setUrls] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('file');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validExtensions = ['.csv', '.txt'];
      const fileExtension = selectedFile.name.toLowerCase().slice(selectedFile.name.lastIndexOf('.'));

      if (!validExtensions.includes(fileExtension)) {
        toast.error('Invalid file type. Please upload CSV or TXT file.');
        return;
      }

      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      // Prepare request based on active tab
      let response: Response;

      if (activeTab === 'file' && file) {
        // File upload
        const formData = new FormData();
        formData.append('file', file);
        if (jobName) {
          formData.append('name', jobName);
        }

        response = await fetch(`${apiUrl}/jobs/create`, {
          method: 'POST',
          body: formData,
        });
      } else if (activeTab === 'manual' && urls.trim()) {
        // Manual URL input
        const urlList = urls
          .split('\n')
          .map(url => url.trim())
          .filter(url => url.length > 0);

        if (urlList.length === 0) {
          toast.error('Please enter at least one URL');
          setIsSubmitting(false);
          return;
        }

        response = await fetch(`${apiUrl}/jobs/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: jobName || 'Untitled Job',
            urls: urlList,
          }),
        });
      } else {
        toast.error('Please provide URLs via file upload or manual input');
        setIsSubmitting(false);
        return;
      }

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to create job');
      }

      toast.success(`Job created successfully! Processing ${result.data.url_count} URLs`);

      // Reset form
      setJobName('');
      setUrls('');
      setFile(null);

      // Close modal if callback provided
      if (onClose) {
        onClose();
      }

      // Navigate to dashboard to see the new job
      router.push('/dashboard');
      router.refresh();

    } catch (error) {
      console.error('Error creating job:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create job');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto" data-testid="job-creation-form">
      <CardHeader>
        <CardTitle data-testid="form-title">Create New Scraping Job</CardTitle>
        <CardDescription data-testid="form-description">
          Upload a file with URLs or enter them manually to start a new scraping job
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Job Name */}
          <div className="space-y-2">
            <label htmlFor="job-name" className="text-sm font-medium" data-testid="job-name-label">
              Job Name (Optional)
            </label>
            <Input
              id="job-name"
              type="text"
              placeholder="e.g., E-commerce Product Scraper"
              value={jobName}
              onChange={(e) => setJobName(e.target.value)}
              disabled={isSubmitting}
              data-testid="job-name-input"
            />
          </div>

          {/* URL Input Methods */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2" data-testid="input-method-tabs">
              <TabsTrigger value="file" data-testid="file-tab">
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </TabsTrigger>
              <TabsTrigger value="manual" data-testid="manual-tab">
                <Link className="h-4 w-4 mr-2" />
                Manual Entry
              </TabsTrigger>
            </TabsList>

            {/* File Upload Tab */}
            <TabsContent value="file" className="space-y-4" data-testid="file-upload-content">
              <div className="space-y-2">
                <label htmlFor="file-upload" className="text-sm font-medium">
                  Upload URL File
                </label>
                <div className="flex items-center gap-4">
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileChange}
                    disabled={isSubmitting}
                    data-testid="file-upload-input"
                    className="cursor-pointer"
                  />
                  {file && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="selected-file">
                      <FileText className="h-4 w-4" />
                      <span>{file.name}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Supported formats: CSV, TXT (one URL per line)
                </p>
              </div>
            </TabsContent>

            {/* Manual Entry Tab */}
            <TabsContent value="manual" className="space-y-4" data-testid="manual-entry-content">
              <div className="space-y-2">
                <label htmlFor="urls" className="text-sm font-medium">
                  URLs (one per line)
                </label>
                <textarea
                  id="urls"
                  placeholder="https://example.com/page1&#10;https://example.com/page2&#10;https://example.com/page3"
                  value={urls}
                  onChange={(e) => setUrls(e.target.value)}
                  disabled={isSubmitting}
                  data-testid="urls-textarea"
                  className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  rows={10}
                />
                <p className="text-xs text-muted-foreground">
                  Enter URLs separated by new lines
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            {onClose && (
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                data-testid="cancel-button"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting || (activeTab === 'file' && !file) || (activeTab === 'manual' && !urls.trim())}
              data-testid="submit-button"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Job...
                </>
              ) : (
                'Create Job'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
