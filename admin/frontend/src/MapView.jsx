import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { REGION_COORDS } from './uzregions.js'

const UZ_CENTER = [41.3, 64.6]

function escapeHtml(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]))
}

export default function MapView({ orgs, DOMAIN }){
  const elRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)

  useEffect(() => {
    if(!elRef.current || mapRef.current) return
    const map = L.map(elRef.current).setView(UZ_CENTER, 6)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19
    }).addTo(map)
    mapRef.current = map
    setTimeout(() => map.invalidateSize(), 60)
    return () => { map.remove(); mapRef.current = null }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if(!map) return
    if(layerRef.current) map.removeLayer(layerRef.current)
    const group = L.layerGroup()
    const active = (orgs || []).filter(o => !o.deleted)
    const withLoc = active.filter(o => (o.lat != null && o.lng != null) || (o.region && REGION_COORDS[o.region]))
    withLoc.forEach(o => {
      const pos = (o.lat != null && o.lng != null) ? [o.lat, o.lng] : REGION_COORDS[o.region]
      const marker = L.circleMarker(pos, { radius: 9, weight: 2, color: '#fff', fillColor: o.color || '#2E3192', fillOpacity: 1 })
      marker.bindPopup(
        '<b>' + escapeHtml(o.name) + '</b><br>' +
        '<a href="https://' + DOMAIN + '/' + o.subdomain + '" target="_blank" rel="noopener">' + escapeHtml(DOMAIN + '/' + o.subdomain) + '</a>' +
        ((o.district || o.region) ? '<br><span style="color:#7C8398">' + escapeHtml([o.district, o.region].filter(Boolean).join(', ')) + '</span>' : '')
      )
      marker.addTo(group)
    })
    group.addTo(map)
    layerRef.current = group
    if(withLoc.length){
      const bounds = L.latLngBounds(withLoc.map(o => (o.lat != null && o.lng != null) ? [o.lat, o.lng] : REGION_COORDS[o.region]))
      map.fitBounds(bounds.pad(0.25))
    }
  }, [orgs, DOMAIN])

  const active = (orgs || []).filter(o => !o.deleted)
  return (
    <div className="mapview-wrap">
      <div ref={elRef} className="mapview" />
      {active.length === 0 && <div className="empty" style={{ marginTop: 16 }}>Hali xaritada ko'rsatiladigan tashkilot yo'q.</div>}
    </div>
  )
}
