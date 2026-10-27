let owners = 0;

/** Track screens already show the payment sheet. The app-wide prompt stays hidden then. */
export function claimDropoffPrompt(): () => void {
  owners += 1;
  return () => {
    owners = Math.max(0, owners - 1);
  };
}

export function dropoffPromptClaimed(): boolean {
  return owners > 0;
}
