import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PreKeyService } from './PreKeyService';
import { supabase } from '@/integrations/supabase/client';
import { getLocalIdentity } from '../crypto/DeviceIdentity';
import { saveProtectedData } from '../crypto/KeyStore';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        from: vi.fn(),
        rpc: vi.fn()
    }
}));
vi.mock('../crypto/DeviceIdentity', () => ({
    getLocalIdentity: vi.fn()
}));
vi.mock('../crypto/KeyStore', () => ({
    saveProtectedData: vi.fn(),
    getProtectedData: vi.fn()
}));

describe('PreKeyService Security and Protocol validation', () => {
    let service: PreKeyService;

    beforeEach(() => {
        service = new PreKeyService();
        vi.clearAllMocks();
    });

    it('publishSignedPreKey should never send Identity Private Key or SPK Private Key to Supabase', async () => {
        const mockUpsert = vi.fn().mockResolvedValue({ error: null });
        (supabase.from as any).mockReturnValue({ upsert: mockUpsert });

        // Mock a local identity
        const mockPriv = new Uint8Array(32).fill(1);
        const mockPub = new Uint8Array(32).fill(2);
        (getLocalIdentity as any).mockResolvedValue({
            private_identity_key: mockPriv,
            public_identity_key: mockPub,
            private_agreement_key: mockPriv,
            public_agreement_key: mockPub
        });

        await service.publishSignedPreKey('test_device');

        expect(mockUpsert).toHaveBeenCalled();
        const payload = mockUpsert.mock.calls[0][0];

        // Ensure no private key artifacts are in the payload
        const payloadString = JSON.stringify(payload);
        expect(payloadString).not.toContain('private');
        
        // Ensure saveProtectedData was called to persist the private SPK
        expect(saveProtectedData).toHaveBeenCalledWith('signed_pre_key', 'latest', expect.objectContaining({
            privateKey: expect.any(Uint8Array)
        }));
    });

    it('publishOneTimePreKeys should never send OPK Private Keys to Supabase', async () => {
        const mockInsert = vi.fn().mockResolvedValue({ error: null });
        (supabase.from as any).mockReturnValue({ insert: mockInsert });

        await service.publishOneTimePreKeys('test_device', 10);

        expect(mockInsert).toHaveBeenCalled();
        const payload = mockInsert.mock.calls[0][0]; // Array of OPKs

        expect(payload.length).toBe(10);
        
        payload.forEach((opk: any) => {
            expect(opk).not.toHaveProperty('privateKey');
            expect(opk).not.toHaveProperty('private_key');
            expect(opk).toHaveProperty('public_key_b64');
            expect(opk.consumed).toBe(false);
        });

        // Ensure saveProtectedData was called to persist the private OPKs pool
        expect(saveProtectedData).toHaveBeenCalledWith('one_time_pre_keys', 'pool', expect.any(Object));
    });

    it('getPreKeyBundle maps the RPC output correctly to PreKeyBundle', async () => {
        (supabase.rpc as any).mockResolvedValue({
            data: {
                identitySigningKeyB64: 'sign_b64',
                identityAgreementKeyB64: 'agree_b64',
                signedPreKey: {
                    keyId: 1,
                    publicKeyB64: 'spk_pub',
                    signatureB64: 'spk_sig'
                },
                oneTimePreKey: {
                    keyId: 5,
                    publicKeyB64: 'opk_pub'
                },
                protocolVersion: 1
            },
            error: null
        });

        const bundle = await service.getPreKeyBundle('test_device');
        
        expect(bundle.identitySigningKeyB64).toBe('sign_b64');
        expect(bundle.signedPreKey.publicKeyB64).toBe('spk_pub');
        expect(bundle.oneTimePreKey!.publicKeyB64).toBe('opk_pub');
    });

    it('getPreKeyBundle handles exhausted OPKs gracefully (null OPK)', async () => {
        (supabase.rpc as any).mockResolvedValue({
            data: {
                identitySigningKeyB64: 'sign_b64',
                identityAgreementKeyB64: 'agree_b64',
                signedPreKey: {
                    keyId: 1,
                    publicKeyB64: 'spk_pub',
                    signatureB64: 'spk_sig'
                },
                oneTimePreKey: null,
                protocolVersion: 1
            },
            error: null
        });

        const bundle = await service.getPreKeyBundle('test_device');
        expect(bundle.oneTimePreKey).toBeNull();
    });
});
