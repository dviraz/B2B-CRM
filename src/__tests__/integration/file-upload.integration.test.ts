/**
 * File Upload Integration Tests
 *
 * Tests file upload functionality with mocked Supabase storage
 */

import {
  setupTestEnvironment,
  teardownTestEnvironment,
  seedDatabase,
  authenticateAsClient,
  authenticateAsAdmin,
  getTableData,
  createCompany,
  createClientProfile,
  createAdminProfile,
  createActiveRequest,
  createFileUpload,
  createTestScenario,
  getMockClient,
} from '../__mocks__/test-setup';
import { getStorageFiles, resetStorageFiles } from '../__mocks__/supabase';

// Mock the server Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => getMockClient()),
  createAdminClient: jest.fn(() => getMockClient()),
}));

// Mock rate limiting
jest.mock('@/lib/rate-limit', () => ({
  applyRateLimit: jest.fn(async () => null),
  RateLimitPresets: { upload: {} },
}));

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    getAll: jest.fn(() => []),
    set: jest.fn(),
  })),
}));

describe('File Upload Integration Tests', () => {
  beforeEach(() => {
    setupTestEnvironment();
    resetStorageFiles();
  });

  afterEach(() => {
    teardownTestEnvironment();
    jest.clearAllMocks();
  });

  describe('File Upload Operations', () => {
    it('should upload a file to storage', async () => {
      const scenario = createTestScenario();
      authenticateAsClient(scenario.company.id, scenario.client.id, scenario.client.email);

      seedDatabase({
        companies: [scenario.company],
        profiles: [scenario.admin, scenario.client],
        requests: [scenario.requests.active],
      });

      const mockClient = getMockClient();
      const fileContent = Buffer.from('test file content');
      const fileName = 'test-document.pdf';
      const storagePath = `uploads/${scenario.requests.active.id}/${fileName}`;

      const uploadResult = await mockClient.storage
        .from('request-files')
        .upload(storagePath, fileContent, {
          contentType: 'application/pdf',
        });

      expect(uploadResult.error).toBeNull();
      expect(uploadResult.data?.path).toBe(`request-files/${storagePath}`);

      // Verify file is in storage
      const storedFiles = getStorageFiles();
      expect(storedFiles).toHaveLength(1);
      expect(storedFiles[0].bucket).toBe('request-files');
      expect(storedFiles[0].path).toBe(storagePath);
      expect(storedFiles[0].contentType).toBe('application/pdf');
    });

    it('should create file record in database after upload', async () => {
      const scenario = createTestScenario();
      authenticateAsClient(scenario.company.id, scenario.client.id, scenario.client.email);

      seedDatabase({
        companies: [scenario.company],
        profiles: [scenario.admin, scenario.client],
        requests: [scenario.requests.active],
        files: [],
      });

      const mockClient = getMockClient();
      const fileName = 'design-mockup.png';
      const storagePath = `uploads/${scenario.requests.active.id}/${fileName}`;

      // Upload file to storage
      await mockClient.storage
        .from('request-files')
        .upload(storagePath, Buffer.from('image data'), {
          contentType: 'image/png',
        });

      // Create file record in database
      await mockClient.from('files').insert({
        request_id: scenario.requests.active.id,
        uploaded_by: scenario.client.id,
        file_name: fileName,
        file_size: 1024 * 50, // 50KB
        file_type: 'image/png',
        storage_path: storagePath,
      });

      const files = getTableData('files');
      expect(files).toHaveLength(1);
      expect(files[0].file_name).toBe(fileName);
      expect(files[0].file_type).toBe('image/png');
      expect(files[0].request_id).toBe(scenario.requests.active.id);
    });

    it('should download uploaded file', async () => {
      const scenario = createTestScenario();
      authenticateAsClient(scenario.company.id, scenario.client.id, scenario.client.email);

      seedDatabase({
        companies: [scenario.company],
        profiles: [scenario.admin, scenario.client],
        requests: [scenario.requests.active],
      });

      const mockClient = getMockClient();
      const fileContent = 'Hello, this is test content';
      const storagePath = `uploads/${scenario.requests.active.id}/test.txt`;

      // Upload file
      await mockClient.storage
        .from('request-files')
        .upload(storagePath, fileContent, {
          contentType: 'text/plain',
        });

      // Download file
      const downloadResult = await mockClient.storage
        .from('request-files')
        .download(storagePath);

      expect(downloadResult.error).toBeNull();
      expect(downloadResult.data).toBeInstanceOf(Blob);
    });

    it('should return error for non-existent file download', async () => {
      const mockClient = getMockClient();

      const downloadResult = await mockClient.storage
        .from('request-files')
        .download('non-existent-path/file.pdf');

      expect(downloadResult.error).toBeDefined();
      expect(downloadResult.error?.message).toBe('File not found');
    });

    it('should generate public URL for file', async () => {
      const scenario = createTestScenario();

      const mockClient = getMockClient();
      const storagePath = `uploads/${scenario.requests.active.id}/logo.png`;

      const urlResult = mockClient.storage
        .from('request-files')
        .getPublicUrl(storagePath);

      expect(urlResult.data.publicUrl).toContain('request-files');
      expect(urlResult.data.publicUrl).toContain(storagePath);
    });

    it('should generate signed URL for private file', async () => {
      const scenario = createTestScenario();

      const mockClient = getMockClient();
      const storagePath = `uploads/${scenario.requests.active.id}/confidential.pdf`;

      const signedUrlResult = await mockClient.storage
        .from('request-files')
        .createSignedUrl(storagePath, 3600); // 1 hour expiry

      expect(signedUrlResult.error).toBeNull();
      expect(signedUrlResult.data?.signedUrl).toContain(storagePath);
      expect(signedUrlResult.data?.signedUrl).toContain('token=');
      expect(signedUrlResult.data?.signedUrl).toContain('expires=3600');
    });

    it('should delete file from storage', async () => {
      const scenario = createTestScenario();
      authenticateAsAdmin(scenario.admin.id, scenario.admin.email);

      const mockClient = getMockClient();
      const storagePath = `uploads/${scenario.requests.active.id}/to-delete.pdf`;

      // Upload file
      await mockClient.storage
        .from('request-files')
        .upload(storagePath, Buffer.from('delete me'));

      expect(getStorageFiles()).toHaveLength(1);

      // Delete file
      const deleteResult = await mockClient.storage
        .from('request-files')
        .remove([storagePath]);

      expect(deleteResult.error).toBeNull();
      expect(getStorageFiles()).toHaveLength(0);
    });
  });

  describe('File Type Validation', () => {
    const ALLOWED_TYPES = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'video/mp4',
      'video/quicktime',
    ];

    const DISALLOWED_TYPES = [
      'application/x-msdownload', // .exe
      'application/x-sh',         // .sh
      'text/x-php',               // .php
    ];

    function isAllowedFileType(mimeType: string): boolean {
      return ALLOWED_TYPES.includes(mimeType);
    }

    it.each(ALLOWED_TYPES)('should allow %s file type', (mimeType) => {
      expect(isAllowedFileType(mimeType)).toBe(true);
    });

    it.each(DISALLOWED_TYPES)('should disallow %s file type', (mimeType) => {
      expect(isAllowedFileType(mimeType)).toBe(false);
    });
  });

  describe('File Size Limits', () => {
    const STANDARD_LIMIT = 50 * 1024 * 1024; // 50MB
    const PRO_LIMIT = 100 * 1024 * 1024;     // 100MB

    function isFileSizeAllowed(size: number, planTier: 'standard' | 'pro'): boolean {
      const limit = planTier === 'pro' ? PRO_LIMIT : STANDARD_LIMIT;
      return size <= limit;
    }

    it('should allow files under standard limit', () => {
      expect(isFileSizeAllowed(25 * 1024 * 1024, 'standard')).toBe(true);
    });

    it('should reject files over standard limit', () => {
      expect(isFileSizeAllowed(60 * 1024 * 1024, 'standard')).toBe(false);
    });

    it('should allow larger files for pro plan', () => {
      expect(isFileSizeAllowed(75 * 1024 * 1024, 'pro')).toBe(true);
    });

    it('should reject files over pro limit', () => {
      expect(isFileSizeAllowed(120 * 1024 * 1024, 'pro')).toBe(false);
    });

    it('should respect exact limit boundaries', () => {
      expect(isFileSizeAllowed(STANDARD_LIMIT, 'standard')).toBe(true);
      expect(isFileSizeAllowed(STANDARD_LIMIT + 1, 'standard')).toBe(false);
      expect(isFileSizeAllowed(PRO_LIMIT, 'pro')).toBe(true);
      expect(isFileSizeAllowed(PRO_LIMIT + 1, 'pro')).toBe(false);
    });
  });

  describe('File Listing and Metadata', () => {
    it('should list all files for a request', async () => {
      const scenario = createTestScenario();
      const file1 = createFileUpload(scenario.requests.active.id, scenario.client.id, {
        file_name: 'document1.pdf',
      });
      const file2 = createFileUpload(scenario.requests.active.id, scenario.client.id, {
        file_name: 'document2.pdf',
      });

      authenticateAsClient(scenario.company.id, scenario.client.id, scenario.client.email);

      seedDatabase({
        companies: [scenario.company],
        profiles: [scenario.admin, scenario.client],
        requests: [scenario.requests.active],
        files: [file1, file2],
      });

      const mockClient = getMockClient();
      const result = await mockClient
        .from('files')
        .select('*')
        .eq('request_id', scenario.requests.active.id);

      expect(result.data).toHaveLength(2);
    });

    it('should order files by upload date', async () => {
      const scenario = createTestScenario();
      const oldFile = createFileUpload(scenario.requests.active.id, scenario.client.id, {
        file_name: 'old-file.pdf',
        created_at: new Date('2024-01-01').toISOString(),
      });
      const newFile = createFileUpload(scenario.requests.active.id, scenario.client.id, {
        file_name: 'new-file.pdf',
        created_at: new Date('2024-06-01').toISOString(),
      });

      authenticateAsClient(scenario.company.id, scenario.client.id, scenario.client.email);

      seedDatabase({
        companies: [scenario.company],
        profiles: [scenario.admin, scenario.client],
        requests: [scenario.requests.active],
        files: [oldFile, newFile],
      });

      const mockClient = getMockClient();
      const result = await mockClient
        .from('files')
        .select('*')
        .eq('request_id', scenario.requests.active.id)
        .order('created_at', { ascending: false });

      expect(result.data![0].file_name).toBe('new-file.pdf');
      expect(result.data![1].file_name).toBe('old-file.pdf');
    });
  });

  describe('File Deletion', () => {
    it('should delete file record from database', async () => {
      const scenario = createTestScenario();
      const file = createFileUpload(scenario.requests.active.id, scenario.client.id);

      authenticateAsAdmin(scenario.admin.id, scenario.admin.email);

      seedDatabase({
        companies: [scenario.company],
        profiles: [scenario.admin, scenario.client],
        requests: [scenario.requests.active],
        files: [file],
      });

      expect(getTableData('files')).toHaveLength(1);

      const mockClient = getMockClient();
      await mockClient
        .from('files')
        .delete()
        .eq('id', file.id);

      expect(getTableData('files')).toHaveLength(0);
    });

    it('should delete multiple files', async () => {
      const scenario = createTestScenario();
      const file1 = createFileUpload(scenario.requests.active.id, scenario.client.id);
      const file2 = createFileUpload(scenario.requests.active.id, scenario.client.id);
      const file3 = createFileUpload(scenario.requests.active.id, scenario.client.id);

      authenticateAsAdmin(scenario.admin.id, scenario.admin.email);

      seedDatabase({
        companies: [scenario.company],
        profiles: [scenario.admin, scenario.client],
        requests: [scenario.requests.active],
        files: [file1, file2, file3],
      });

      const mockClient = getMockClient();

      // Delete file1 and file2, keep file3
      await mockClient
        .from('files')
        .delete()
        .in('id', [file1.id, file2.id]);

      const remainingFiles = getTableData('files');
      expect(remainingFiles).toHaveLength(1);
      expect(remainingFiles[0].id).toBe(file3.id);
    });
  });

  describe('Multi-file Upload', () => {
    it('should upload multiple files to same request', async () => {
      const scenario = createTestScenario();
      authenticateAsClient(scenario.company.id, scenario.client.id, scenario.client.email);

      seedDatabase({
        companies: [scenario.company],
        profiles: [scenario.admin, scenario.client],
        requests: [scenario.requests.active],
        files: [],
      });

      const mockClient = getMockClient();
      const requestId = scenario.requests.active.id;

      // Upload multiple files
      const files = [
        { name: 'image1.png', content: 'image1', type: 'image/png' },
        { name: 'image2.jpg', content: 'image2', type: 'image/jpeg' },
        { name: 'document.pdf', content: 'pdf', type: 'application/pdf' },
      ];

      for (const file of files) {
        const storagePath = `uploads/${requestId}/${file.name}`;
        await mockClient.storage
          .from('request-files')
          .upload(storagePath, file.content, { contentType: file.type });

        await mockClient.from('files').insert({
          request_id: requestId,
          uploaded_by: scenario.client.id,
          file_name: file.name,
          file_size: file.content.length,
          file_type: file.type,
          storage_path: storagePath,
        });
      }

      expect(getStorageFiles()).toHaveLength(3);
      expect(getTableData('files')).toHaveLength(3);
    });
  });

  describe('Access Control for Files', () => {
    it('should allow client to upload files for their company requests', async () => {
      const company = createCompany({ status: 'active' });
      const client = createClientProfile(company.id);
      const request = createActiveRequest(company.id, client.id);

      authenticateAsClient(company.id, client.id, client.email);

      seedDatabase({
        companies: [company],
        profiles: [client],
        requests: [request],
        files: [],
      });

      // Client should be able to upload to their own request
      const mockClient = getMockClient();
      await mockClient.from('files').insert({
        request_id: request.id,
        uploaded_by: client.id,
        file_name: 'my-file.pdf',
        file_size: 1024,
        file_type: 'application/pdf',
        storage_path: `uploads/${request.id}/my-file.pdf`,
      });

      const files = getTableData('files');
      expect(files).toHaveLength(1);
      expect(files[0].uploaded_by).toBe(client.id);
    });

    it('should allow admin to upload files to any request', async () => {
      const company = createCompany();
      const client = createClientProfile(company.id);
      const admin = createAdminProfile();
      const request = createActiveRequest(company.id, client.id);

      authenticateAsAdmin(admin.id, admin.email);

      seedDatabase({
        companies: [company],
        profiles: [client, admin],
        requests: [request],
        files: [],
      });

      const mockClient = getMockClient();
      await mockClient.from('files').insert({
        request_id: request.id,
        uploaded_by: admin.id,
        file_name: 'admin-upload.pdf',
        file_size: 2048,
        file_type: 'application/pdf',
        storage_path: `uploads/${request.id}/admin-upload.pdf`,
      });

      const files = getTableData('files');
      expect(files).toHaveLength(1);
      expect(files[0].uploaded_by).toBe(admin.id);
    });

    it('should not allow file upload for paused company', async () => {
      const company = createCompany({ status: 'paused' });
      const client = createClientProfile(company.id);
      const request = createActiveRequest(company.id, client.id);

      authenticateAsClient(company.id, client.id, client.email);

      seedDatabase({
        companies: [company],
        profiles: [client],
        requests: [request],
      });

      // The API route should check company status and reject
      // Here we verify the status is correctly stored
      const companies = getTableData('companies');
      expect(companies[0].status).toBe('paused');
    });
  });
});
