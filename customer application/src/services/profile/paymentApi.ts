import { API_ENDPOINTS } from '../../config/api';
import type { ApiSuccessResponse } from '../../types/auth';
import type { PaymentMethod, WalletBalance } from '../../types/profile';
import { apiClient } from '../api/apiClient';

interface BackendPaymentMethod {
  id: string;
  type: string;
  label: string;
  details: string;
  isDefault: boolean;
  createdAt?: string;
}

function mapPaymentMethod(pm: BackendPaymentMethod): PaymentMethod {
  return {
    id: pm.id,
    type: pm.type as PaymentMethod['type'],
    label: pm.label,
    details: pm.details,
    isDefault: pm.isDefault,
  };
}

export async function listPaymentMethods(): Promise<PaymentMethod[]> {
  try {
    const { data } = await apiClient.get<ApiSuccessResponse<BackendPaymentMethod[]>>(
      API_ENDPOINTS.paymentMethods,
    );
    return Array.isArray(data?.data) ? data.data.map(mapPaymentMethod) : [];
  } catch {
    return [];
  }
}

export async function createPaymentMethod(payload: {
  type: PaymentMethod['type'];
  label: string;
  details: string;
  isDefault?: boolean;
}): Promise<PaymentMethod> {
  const { data } = await apiClient.post<ApiSuccessResponse<BackendPaymentMethod>>(
    API_ENDPOINTS.paymentMethods,
    payload,
  );
  return mapPaymentMethod(data.data);
}

export async function deletePaymentMethod(id: string): Promise<void> {
  await apiClient.delete(`${API_ENDPOINTS.paymentMethods}/${id}`);
}

export async function getWalletBalance(): Promise<WalletBalance> {
  try {
    const { data } = await apiClient.get<ApiSuccessResponse<WalletBalance>>(API_ENDPOINTS.wallet);
    return data?.data ?? { balance: 0, currency: 'INR' };
  } catch {
    return { balance: 0, currency: 'INR' };
  }
}
