import { Component } from 'react'
import './ErrorBoundary.css'

const RELOAD_KEY = 'riri_chunk_reload'

// After a deploy, a tab that was already open asks for page files that no longer
// exist. One automatic reload fetches the new version; the flag stops reload loops.
const isStaleDeploy = (err) =>
  /dynamically imported module|Importing a module script failed|Failed to fetch dynamically|error loading dynamically/i
    .test(err?.message || '')

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    if (isStaleDeploy(error) && !sessionStorage.getItem(RELOAD_KEY)) {
      sessionStorage.setItem(RELOAD_KEY, '1')
      window.location.reload()
      return
    }
    console.error('Page crashed:', error, info?.componentStack)
  }

  componentDidMount() {
    // Only re-arm the auto-reload once the page has stayed healthy for a while,
    // so a file that's genuinely missing shows this screen instead of looping
    this.healthy = setTimeout(() => sessionStorage.removeItem(RELOAD_KEY), 10000)
  }

  componentWillUnmount() {
    clearTimeout(this.healthy)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="crash" role="alert">
        <div className="crash-card">
          <div className="crash-eyebrow mono">something wilted</div>
          <h1 className="crash-title display">This page didn&apos;t load</h1>
          <p className="crash-text serif">
            It&apos;s not you — something went wrong on our side. Reloading usually fixes it.
          </p>
          <div className="crash-actions">
            <button className="pill active" onClick={() => window.location.reload()}>Reload</button>
            <a className="pill" href="/">Go home</a>
          </div>
        </div>
      </div>
    )
  }
}
