import { Auth0Provider } from '@auth0/auth0-react'
import { useNavigate } from 'react-router-dom'

const domain = import.meta.env.VITE_AUTH0_DOMAIN?.trim()
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID?.trim()
const audience = import.meta.env.VITE_AUTH0_AUDIENCE?.trim()

export function isAuth0Configured() {
  return Boolean(domain && clientId)
}

export function hasAuth0CallbackParams() {
  const params = new URLSearchParams(window.location.search)
  return Boolean(
    (params.get('code') && params.get('state')) || (params.get('error') && params.get('state')),
  )
}

export function getAuth0RedirectUri() {
  return window.location.origin
}

export default function Auth0ProviderWrapper({ children }) {
  const navigate = useNavigate()

  if (!isAuth0Configured()) {
    return children
  }

  const authorizationParams = {
    redirect_uri: getAuth0RedirectUri(),
  }
  if (audience) authorizationParams.audience = audience

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={authorizationParams}
      cacheLocation="localstorage"
      useRefreshTokens={false}
      onRedirectCallback={(appState) => {
        const returnTo = appState?.returnTo || '/dashboard'
        navigate(returnTo, { replace: true })
      }}
    >
      {children}
    </Auth0Provider>
  )
}
