import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useCountdown } from '../../hooks/useCountdown'
import VerifyIdentityModal from '../featured/VerifyIdentityModal.jsx'

function FeaturedCountdown({ date }) {
  const { days, hours, minutes, seconds, isExpired } = useCountdown(date)

  if (isExpired) {
    return (
      <span style={{ fontFamily: 'var(--db-font-display)', fontSize: 13, letterSpacing: '0.06em', color: '#ff6b35' }}>
        LIVE NOW
      </span>
    )
  }

  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0 || days > 0) parts.push(`${hours}h`)
  parts.push(`${minutes}m`)
  if (days === 0) parts.push(`${String(seconds).padStart(2, '0')}s`)

  return (
    <span style={{ fontFamily: 'var(--db-font-mono)', fontSize: 14, fontWeight: 700, color: '#e8e8f4', letterSpacing: '0.04em', fontVariantNumeric: 'tabular-nums' }}>
      {parts.join(' ')}
    </span>
  )
}

export default function FeaturedBanner() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [featured, setFeatured] = useState(null)
  const [hasEntered, setHasEntered] = useState(false)
  const [joining, setJoining] = useState(false)
  const [entryResult, setEntryResult] = useState(null)
  const [showVerifyModal, setShowVerifyModal] = useState(false)

  useEffect(() => {
    supabase
      .from('featured_games')
      .select('*')
      .in('status', ['active', 'live'])
      .order('starts_at', { ascending: true })
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]) setFeatured(data[0])
      })
  }, [])

  useEffect(() => {
    if (!featured || !user) return
    supabase
      .from('featured_entries')
      .select('id')
      .eq('featured_game_id', featured.id)
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setHasEntered(true)
      })
  }, [featured, user])

  const handleJoin = async (e) => {
    e.stopPropagation()
    if (!user || !featured || joining) return

    // Check eligibility first
    const { data: eligibility, error: eligErr } = await supabase.rpc('check_featured_eligibility')

    if (eligErr || !eligibility?.eligible) {
      setShowVerifyModal(true)
      return
    }

    setJoining(true)
    setEntryResult(null)

    try {
      const { data, error } = await supabase.rpc('join_featured_game', {
        p_featured_game_id: featured.id,
      })
      if (error) throw error

      if (data?.success) {
        setHasEntered(true)
        setEntryResult({
          ok: true,
          msg: data.reason === 'already_entered'
            ? 'Already entered!'
            : `Entered!${data.charged > 0 ? ` −${data.charged} Dobs` : ' Free entry'}`,
        })
      } else {
        if (data?.reason === 'email_not_verified' || data?.reason === 'phone_not_verified') {
          setShowVerifyModal(true)
        } else {
          setEntryResult({
            ok: false,
            msg: data?.reason === 'insufficient_dobs'
              ? `Not enough Dobs (need ${data.cost}, have ${data.balance})`
              : data?.reason || 'Could not join',
          })
        }
      }
    } catch (err) {
      setEntryResult({ ok: false, msg: err.message })
    } finally {
      setJoining(false)
    }
  }

  const handleVerified = () => {
    setShowVerifyModal(false)
    handleJoin({ stopPropagation: () => {} })
  }

  const handleBannerClick = () => {
    if (hasEntered && featured?.room_id) {
      navigate(`/room/${featured.room_id}`)
    }
  }

  if (!featured) return null

  return (
    <div
      onClick={handleBannerClick}
      style={{
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 20,
        cursor: hasEntered && featured.room_id ? 'pointer' : 'default',
        border: '1px solid rgba(255,107,53,0.3)',
        background: featured.banner_image_url
          ? `linear-gradient(135deg, rgba(12,12,20,0.85) 0%, rgba(12,12,20,0.6) 100%), url(${featured.banner_image_url}) center/cover`
          : 'linear-gradient(135deg, rgba(255,107,53,0.08) 0%, rgba(255,255,255,0.02) 50%, rgba(8,8,16,1) 100%)',
        minHeight: 160,
      }}
    >
      {/* Orange glow accent */}
      <div style={{
        position: 'absolute', top: -40, right: -40, width: 200, height: 200,
        background: 'radial-gradient(circle, rgba(255,107,53,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', padding: '20px 20px 16px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {featured.prize_image_url && (
          <div style={{
            width: 80, height: 80, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
            border: '2px solid rgba(255,107,53,0.3)', background: '#0c0c14',
          }}>
            <img src={featured.prize_image_url} alt={featured.prize_name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{
              fontFamily: 'var(--db-font-display)', fontSize: 10,
              letterSpacing: '0.1em', color: '#ff6b35',
              background: 'rgba(255,107,53,0.12)', padding: '3px 10px', borderRadius: 20,
            }}>
              ⭐ FEATURED
            </span>
            <span style={{ fontFamily: 'var(--db-font-ui)', fontSize: 10, fontWeight: 500, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em' }}>
              {featured.sport.toUpperCase()}
            </span>
          </div>

          <h2 style={{
            fontFamily: 'var(--db-font-display)', fontSize: 'clamp(18px, 4vw, 26px)',
            color: '#e0e0f0', lineHeight: 1.1, margin: '0 0 4px',
            letterSpacing: '0.02em',
          }}>
            {featured.title}
          </h2>

          {featured.subtitle && (
            <p style={{ fontFamily: 'var(--db-font-mono)', fontSize: 12, color: '#ff6b35', fontWeight: 700, margin: '0 0 8px' }}>
              {featured.subtitle}
            </p>
          )}

          <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
            <div>
              <span style={{ fontFamily: 'var(--db-font-display)', fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', display: 'block' }}>
                STARTS IN
              </span>
              <FeaturedCountdown date={featured.starts_at} />
            </div>
            <div>
              <span style={{ fontFamily: 'var(--db-font-display)', fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', display: 'block' }}>
                PRIZE
              </span>
              <span style={{ fontFamily: 'var(--db-font-ui)', fontSize: 13, fontWeight: 600, color: '#e8e8f4' }}>
                {featured.prize_name}
              </span>
            </div>
            <div>
              <span style={{ fontFamily: 'var(--db-font-display)', fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', display: 'block' }}>
                ENTRY
              </span>
              <span style={{ fontFamily: 'var(--db-font-ui)', fontSize: 13, fontWeight: 600, color: '#e8e8f4' }}>
                {featured.free_entry ? 'FREE' : `${featured.entry_fee} Dobs`}
              </span>
            </div>
            <div>
              <span style={{ fontFamily: 'var(--db-font-display)', fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', display: 'block' }}>
                PLAYERS
              </span>
              <span style={{ fontFamily: 'var(--db-font-mono)', fontSize: 13, fontWeight: 600, color: '#e8e8f4', fontVariantNumeric: 'tabular-nums' }}>
                {featured.entries_count}
              </span>
            </div>
          </div>

          {entryResult && (
            <p style={{
              fontFamily: 'var(--db-font-ui)', fontSize: 11, fontWeight: 500, marginBottom: 8,
              color: entryResult.ok ? '#22c55e' : '#ff5555',
            }}>
              {entryResult.msg}
            </p>
          )}

          {hasEntered ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: 'var(--db-font-ui)', fontSize: 12, fontWeight: 600, color: '#22c55e' }}>
                ✓ Entered
              </span>
              {featured.room_id && (
                <span style={{ fontFamily: 'var(--db-font-ui)', fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.35)' }}>
                  Tap to play →
                </span>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={handleJoin}
              disabled={joining}
              style={{
                padding: '10px 28px', borderRadius: 8, border: 'none', cursor: joining ? 'wait' : 'pointer',
                background: 'linear-gradient(135deg, #ff7a45 0%, #e05520 100%)', color: '#fff',
                fontFamily: 'var(--db-font-display)', fontSize: 14, letterSpacing: '0.08em',
                opacity: joining ? 0.5 : 1,
                transition: 'opacity 0.15s ease',
                boxShadow: '0 4px 16px rgba(255,107,53,0.4)',
              }}
            >
              {joining ? 'JOINING…' : featured.free_entry ? 'ENTER FREE' : `ENTER · ${featured.entry_fee} DOBS`}
            </button>
          )}
        </div>
      </div>

      {showVerifyModal && (
        <VerifyIdentityModal
          onClose={() => setShowVerifyModal(false)}
          onVerified={handleVerified}
        />
      )}

      {/* Winner overlay for finished games */}
      {featured.status === 'finished' && featured.winner_username && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(12,12,20,0.85)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontFamily: 'var(--db-font-display)', fontSize: 11, letterSpacing: '0.1em', color: '#ff6b35', marginBottom: 6 }}>
            🏆 WINNER
          </span>
          <span style={{ fontFamily: 'var(--db-font-display)', fontSize: 32, color: '#e8e8f4', letterSpacing: '0.04em' }}>
            {featured.winner_username}
          </span>
          <span style={{ fontFamily: 'var(--db-font-ui)', fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
            Won {featured.prize_name}!
          </span>
        </div>
      )}
    </div>
  )
}
