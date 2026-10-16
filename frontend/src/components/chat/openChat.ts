export const OPEN_CHAT_EVENT = 'cedarline:open-chat'

/** Open the floating assistant from anywhere on the site, optionally asking a question straight away. */
export function openChat(question?: string) {
  window.dispatchEvent(new CustomEvent<string | undefined>(OPEN_CHAT_EVENT, { detail: question }))
}
