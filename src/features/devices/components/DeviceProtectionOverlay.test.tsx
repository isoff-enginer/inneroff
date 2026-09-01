import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeviceProtectionOverlay } from './DeviceProtectionOverlay';
import * as KeyStore from '../../messages/crypto/KeyStore';
import * as SessionHooks from '../../auth/session';

// Mock dependencies
vi.mock('../../messages/crypto/KeyStore', () => ({
  getProtectedData: vi.fn(),
}));

vi.mock('../../auth/session', () => ({
  useSession: vi.fn(),
}));

describe('DeviceProtectionOverlay', () => {
  const mockRegisterDevice = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (SessionHooks.useSession as any).mockReturnValue({
      isAuthenticated: true,
      registerDevice: mockRegisterDevice,
    });
  });

  it('identidad local inexistente => muestra onboarding', async () => {
    (KeyStore.getProtectedData as any).mockResolvedValue(null);

    render(
      <DeviceProtectionOverlay>
        <div data-testid="children">Contenido de la app</div>
      </DeviceProtectionOverlay>
    );

    expect(await screen.findByText('Protege tu dispositivo')).toBeInTheDocument();
    expect(screen.queryByTestId('children')).not.toBeInTheDocument();
  });

  it('identidad válida => muestra children', async () => {
    (KeyStore.getProtectedData as any).mockResolvedValue({
      device_id: '123',
      public_identity_key_b64: 'key1',
      public_agreement_key_b64: 'key2',
    });

    render(
      <DeviceProtectionOverlay>
        <div data-testid="children">Contenido de la app</div>
      </DeviceProtectionOverlay>
    );

    expect(await screen.findByTestId('children')).toBeInTheDocument();
  });

  it('PIN menor de 4 => no permite continuar', async () => {
    (KeyStore.getProtectedData as any).mockResolvedValue(null);

    render(<DeviceProtectionOverlay>App</DeviceProtectionOverlay>);
    
    await screen.findByText('Protege tu dispositivo');
    
    const input = screen.getByRole('textbox') || screen.getByDisplayValue(''); // type="password" might not have role textbox
    // Using a more robust selector for the password input:
    const passwordInput = document.querySelector('input[type="password"]')!;
    
    fireEvent.change(passwordInput, { target: { value: '123' } });
    
    const button = screen.getByText('Continuar');
    expect(button).toBeDisabled();
  });

  it('PIN mayor de 6 => no permite continuar (maxLength enforces this, but UI should disable)', async () => {
    (KeyStore.getProtectedData as any).mockResolvedValue(null);
    render(<DeviceProtectionOverlay>App</DeviceProtectionOverlay>);
    
    await screen.findByText('Protege tu dispositivo');
    const passwordInput = document.querySelector('input[type="password"]')!;
    
    fireEvent.change(passwordInput, { target: { value: '1234567' } });
    
    const button = screen.getByText('Continuar');
    // If the input allows 7 despite max length during programmatic change, it should be disabled
    expect(button).toBeDisabled();
  });

  it('caracteres no numéricos => rechazar', async () => {
    (KeyStore.getProtectedData as any).mockResolvedValue(null);
    render(<DeviceProtectionOverlay>App</DeviceProtectionOverlay>);
    
    await screen.findByText('Protege tu dispositivo');
    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
    
    fireEvent.change(passwordInput, { target: { value: 'abcd' } });
    
    // El input ignora letras por el onChange handler
    expect(passwordInput.value).toBe('');
  });

  it('PIN y confirmación diferentes => no llama registerDevice y muestra error', async () => {
    (KeyStore.getProtectedData as any).mockResolvedValue(null);
    render(<DeviceProtectionOverlay>App</DeviceProtectionOverlay>);
    
    await screen.findByText('Protege tu dispositivo');
    const passwordInput = document.querySelector('input[type="password"]')!;
    
    fireEvent.change(passwordInput, { target: { value: '1234' } });
    fireEvent.click(screen.getByText('Continuar'));

    expect(await screen.findByText('Confirma tu PIN')).toBeInTheDocument();
    
    fireEvent.change(passwordInput, { target: { value: '5678' } });
    fireEvent.click(screen.getByText('Activar seguridad'));

    expect(await screen.findByText('Los PIN no coinciden.')).toBeInTheDocument();
    expect(mockRegisterDevice).not.toHaveBeenCalled();
  });

  it('registerDevice llamado exactamente una vez, éxito => muestra children, PIN limpiado', async () => {
    (KeyStore.getProtectedData as any)
      .mockResolvedValueOnce(null) // First check: no identity
      .mockResolvedValueOnce({ device_id: 'new123', public_identity_key_b64: 'ok', public_agreement_key_b64: 'ok' }); // After registration check

    mockRegisterDevice.mockResolvedValue(undefined);

    render(
      <DeviceProtectionOverlay>
        <div data-testid="children">App Load</div>
      </DeviceProtectionOverlay>
    );
    
    await screen.findByText('Protege tu dispositivo');
    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
    
    // Step 1: setup
    fireEvent.change(passwordInput, { target: { value: '1234' } });
    fireEvent.click(screen.getByText('Continuar'));

    // Step 2: confirm
    expect(await screen.findByText('Confirma tu PIN')).toBeInTheDocument();
    fireEvent.change(passwordInput, { target: { value: '1234' } });
    fireEvent.click(screen.getByText('Activar seguridad'));

    expect(await screen.findByText('Protegiendo dispositivo...')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockRegisterDevice).toHaveBeenCalledTimes(1);
      expect(mockRegisterDevice).toHaveBeenCalledWith('1234');
    });

    expect(await screen.findByTestId('children')).toBeInTheDocument();
    expect(passwordInput.value).toBe(''); // PIN is cleared
  });

  it('error => muestra estado de error', async () => {
    (KeyStore.getProtectedData as any).mockResolvedValue(null);
    mockRegisterDevice.mockRejectedValue(new Error('Network error'));

    render(<DeviceProtectionOverlay>App</DeviceProtectionOverlay>);
    
    await screen.findByText('Protege tu dispositivo');
    const passwordInput = document.querySelector('input[type="password"]')!;
    
    fireEvent.change(passwordInput, { target: { value: '1234' } });
    fireEvent.click(screen.getByText('Continuar'));
    
    await screen.findByText('Confirma tu PIN');
    fireEvent.change(passwordInput, { target: { value: '1234' } });
    fireEvent.click(screen.getByText('Activar seguridad'));

    expect(await screen.findByText('No pudimos proteger este dispositivo.')).toBeInTheDocument();
  });
});
