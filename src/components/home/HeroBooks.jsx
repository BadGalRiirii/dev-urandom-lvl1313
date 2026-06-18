import './HeroBooks.css'

/* Decorative book spines — sit behind the hero title text */
export default function HeroBooks() {
  return (
    <div className="hero-books" aria-hidden="true">
      <div className="hb hb-plum"    />
      <div className="hb hb-gold"    />
      <div className="hb hb-teal"    />
      <div className="hb hb-forest"  />
      <div className="hb hb-burg"    />
      <div className="hb hb-slate"   />
    </div>
  )
}
