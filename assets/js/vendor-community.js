export const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/Lu81eLXaRfN5ZkeJdiV63C'

const WHATSAPP_ICON_SRC = 'assets/images/whatsapp-color-svgrepo-com.svg'

export function initVendorCommunityButton() {
  if (document.querySelector('.vendor-community-fab')) return

  const link = document.createElement('a')
  link.className = 'vendor-community-fab'
  link.href = WHATSAPP_GROUP_URL
  link.target = '_blank'
  link.rel = 'noopener'
  link.title = 'Join the vendor community'
  link.setAttribute('aria-label', 'Join the Vendorly vendor community on WhatsApp')

  const img = document.createElement('img')
  img.src = WHATSAPP_ICON_SRC
  img.alt = ''
  img.width = 30
  img.height = 30

  link.append(img)
  document.body.append(link)
}