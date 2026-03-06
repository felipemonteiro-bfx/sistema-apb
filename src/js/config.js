/** URL base das Cloud Functions. Pode ser sobrescrita por VITE_FUNCTIONS_URL. */
export const FUNCTIONS_URL =
  import.meta.env.VITE_FUNCTIONS_URL || 'https://us-central1-sistema-apb.cloudfunctions.net';
