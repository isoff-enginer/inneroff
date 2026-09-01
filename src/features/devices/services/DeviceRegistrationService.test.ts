import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeviceRegistrationService } from './DeviceRegistrationService';
import { supabase } from '@/integrations/supabase/client';
import { getProtectedData } from '../../messages/crypto/KeyStore';
import { generateAndSaveDeviceIdentity, loadAndUnlockDeviceIdentity } from '../../messages/crypto/DeviceIdentity';
import { PreKeyService } from '../../messages/services/PreKeyService';

vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        auth: {
            getUser: vi.fn()
        },
        from: vi.fn()
    }
}));
vi.mock('../../messages/crypto/KeyStore', () => ({
    getProtectedData: vi.fn(),
    saveProtectedData: vi.fn()
}));
vi.mock('../../messages/crypto/DeviceIdentity', () => ({
    generateAndSaveDeviceIdentity: vi.fn(),
    loadAndUnlockDeviceIdentity: vi.fn()
}));
vi.mock('../../messages/services/PreKeyService', () => ({
    PreKeyService: vi.fn().mockImplementation(() => ({
        publishSignedPreKey: vi.fn(),
        publishOneTimePreKeys: vi.fn()
    }))
}));

describe('DeviceRegistrationService', () => {
    let service: DeviceRegistrationService;

    beforeEach(() => {
        service = new DeviceRegistrationService();
        vi.clearAllMocks();
        
        // Mock auth user
        (supabase.auth.getUser as any).mockResolvedValue({
            data: { user: { id: 'user-123' } }
        });
    });

    it('creates a new device identity and registers it if not found locally', async () => {
        (getProtectedData as any).mockResolvedValue(null); // Local identity doesn't exist
        
        (generateAndSaveDeviceIdentity as any).mockResolvedValue({
            device_id: 'local-dev-123',
            public_identity_key_b64: 'sign_pub_b64',
            public_agreement_key_b64: 'agree_pub_b64'
        });

        // Supabase select says it doesn't exist remotely
        const mockSelect = vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null }) });
        
        // Supabase insert returns new device id
        const mockInsert = vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: 'remote-uuid' }, error: null })
            })
        });

        (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'authorized_devices') {
                return {
                    select: mockSelect,
                    insert: mockInsert
                };
            }
        });

        (loadAndUnlockDeviceIdentity as any).mockResolvedValue({
            privateIdentityKey: new Uint8Array(32) // Dummy
        });

        await service.registerCurrentDevice('1234', 'Test Browser');

        expect(generateAndSaveDeviceIdentity).toHaveBeenCalled();
        expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
            user_id: 'user-123',
            device_public_key: 'sign_pub_b64',
            device_name: 'Test Browser'
        }));

        // Access the mocked preKeyService
        const preKeyServiceMock = (service as any).preKeyService;
        expect(preKeyServiceMock.publishSignedPreKey).toHaveBeenCalled();
        expect(preKeyServiceMock.publishOneTimePreKeys).toHaveBeenCalledWith('remote-uuid', 100);
    });

    it('is idempotent and reuses existing identity if already active in Supabase', async () => {
        (getProtectedData as any).mockResolvedValue({
            device_id: 'local-dev-123',
            public_identity_key_b64: 'sign_pub_b64',
            public_agreement_key_b64: 'agree_pub_b64'
        });

        // Supabase select says it DOES exist remotely and is active
        const mockSelect = vi.fn().mockReturnValue({ 
            maybeSingle: vi.fn().mockResolvedValue({ data: { status: 'active' } }) 
        });

        (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'authorized_devices') {
                return { select: mockSelect };
            }
        });

        await service.registerCurrentDevice('1234', 'Test Browser');

        // Should NOT generate new identity
        expect(generateAndSaveDeviceIdentity).not.toHaveBeenCalled();
        
        // Access the mocked preKeyService
        const preKeyServiceMock = (service as any).preKeyService;
        expect(preKeyServiceMock.publishSignedPreKey).not.toHaveBeenCalled();
    });
});
