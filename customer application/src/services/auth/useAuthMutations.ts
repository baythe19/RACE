import { useCallback, useState } from 'react';

import { useAppDispatch } from '../../redux/hooks';
import {
  completeProfileSuccess,
  setCredentials,
  setLoading,
  setPendingMobileNumber,
} from '../../redux/auth/authSlice';
import { completeProfile, sendOtp, verifyOtp } from './authApi';
import type { CompleteProfileRequest, SendOtpRequest, VerifyOtpRequest } from '../../types/auth';
import { getApiErrorMessage } from '../api/apiClient';

function useAsyncMutation<TVariables, TResult>(
  fn: (variables: TVariables) => Promise<TResult>,
  options?: {
    onMutate?: (variables: TVariables) => void;
    onSuccess?: (data: TResult, variables: TVariables) => void;
    onError?: () => void;
    onSettled?: () => void;
  },
) {
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(
    async (variables: TVariables) => {
      setIsPending(true);
      options?.onMutate?.(variables);
      try {
        const data = await fn(variables);
        options?.onSuccess?.(data, variables);
        return data;
      } catch (error) {
        options?.onError?.();
        throw error;
      } finally {
        setIsPending(false);
        options?.onSettled?.();
      }
    },
    [fn, options],
  );

  return { mutateAsync, isPending };
}

export function useSendOtpMutation() {
  const dispatch = useAppDispatch();

  return useAsyncMutation<SendOtpRequest, Awaited<ReturnType<typeof sendOtp>>>(
    sendOtp,
    {
      onMutate: () => dispatch(setLoading(true)),
      onSuccess: (_data, variables) => {
        dispatch(setPendingMobileNumber(variables.mobileNumber));
        dispatch(setLoading(false));
      },
      onError: () => dispatch(setLoading(false)),
    },
  );
}

export function useVerifyOtpMutation() {
  const dispatch = useAppDispatch();

  return useAsyncMutation<VerifyOtpRequest, Awaited<ReturnType<typeof verifyOtp>>>(
    verifyOtp,
    {
      onMutate: () => dispatch(setLoading(true)),
      onSuccess: data => {
        dispatch(
          setCredentials({
            user: data.user,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            onboardingRequired: data.onboardingRequired,
          }),
        );
        dispatch(setLoading(false));
      },
      onError: () => dispatch(setLoading(false)),
    },
  );
}

export function useCompleteProfileMutation() {
  const dispatch = useAppDispatch();

  return useAsyncMutation<CompleteProfileRequest, Awaited<ReturnType<typeof completeProfile>>>(
    completeProfile,
    {
      onMutate: () => dispatch(setLoading(true)),
      onSuccess: user => {
        dispatch(completeProfileSuccess(user));
      },
      onError: () => dispatch(setLoading(false)),
    },
  );
}

export { getApiErrorMessage };
