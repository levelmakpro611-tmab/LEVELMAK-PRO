/**
 * Dispatches a custom event to show the luxury PremiumAlertModal.
 * This can be imported and called from any React component or hook.
 */
export const triggerPremiumAlert = (
  title: string,
  message: string,
  actionText?: string,
  onAction?: () => void
) => {
  const event = new CustomEvent('show_premium_alert', {
    detail: { title, message, actionText, onAction }
  });
  window.dispatchEvent(event);
};
