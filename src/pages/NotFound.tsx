import { ArrowLeft, Compass } from 'lucide-react'
import { Link } from 'react-router-dom'
export default function NotFound() {
  return (
    <div className="empty-state not-found">
      <Compass size={42} />
      <span className="eyebrow">404 · A LITTLE OFF THE MAP</span>
      <h1>This page isn’t in the toolbox.</h1>
      <p>Let’s get you back to something useful.</p>
      <Link to="/" className="button button-primary">
        <ArrowLeft size={16} />
        Back to dashboard
      </Link>
    </div>
  )
}
