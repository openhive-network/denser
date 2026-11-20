/**
 * The English text of the 503 page, bundled with it: the page shows when things are broken, the
 * locale file included, and a t() that cannot load its namespace would show the keys instead. The
 * values are the English locale's (service-unavailable-english.test.ts keeps them equal); every
 * locale still translates the page once its file loads.
 */
export const SERVICE_UNAVAILABLE_ENGLISH = {
  'service_unavailable.title': 'Service Temporarily Unavailable',
  'service_unavailable.description': "We're having trouble connecting to the Hive network. This is usually temporary.",
  'service_unavailable.what_you_can_do': 'What you can do',
  'service_unavailable.refresh': 'Try refreshing the page in a few moments',
  'service_unavailable.check_api_status': 'Check the API status on the health checker',
  'service_unavailable.check_back': "Check back shortly — we're working on it",
  'four_oh_four.go_home': 'Go Home',
  'user_profile.check_node_status': 'Check Node Status'
} as const;

export type ServiceUnavailableKey = keyof typeof SERVICE_UNAVAILABLE_ENGLISH;
