import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow })

const UZ_CENTER = [41.3, 64.6]

// Xaritani bosib lat/lng tanlash. lat/lng berilsa — belgi shu yerda; aks holda
// center (viloyat markazi) ga fokuslanadi; ikkalasi ham bo'lmasa — O'zbekiston markazi.
export default function CoordPicker({ lat, lng, center, onPick }){
  const elRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)

  useEffect(() => {
    if(!elRef.current || mapRef.current) return
    const startCenter = (lat != null && lng != null) ? [lat, lng] : (center || UZ_CENTER)
    const startZoom = (lat != null && lng != null) ? 13 : (center ? 10 : 6)
    const map = L.map(elRef.current, { scrollWheelZoom: false }).setView(startCenter, startZoom)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19
    }).addTo(map)
    map.on('click', e => onPick(e.latlng.lat, e.latlng.lng))
    mapRef.current = map
    setTimeout(() => map.invalidateSize(), 60)
    return () => { map.remove(); mapRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Viloyat almashtirilganda (lat/lng hali tanlanmagan bo'lsa) markazni surish
  useEffect(() => {
    const map = mapRef.current
    if(!map || (lat != null && lng != null)) return
    if(center) map.setView(center, 10)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center ? center[0] : null, center ? center[1] : null])

  // Belgini lat/lng ga moslab chizish
  useEffect(() => {
    const map = mapRef.current
    if(!map) return
    if(markerRef.current){ map.removeLayer(markerRef.current); markerRef.current = null }
    if(lat != null && lng != null){
      markerRef.current = L.marker([lat, lng]).addTo(map)
    }
  }, [lat, lng])

  return <div ref={elRef} className="coord-picker" />
}
