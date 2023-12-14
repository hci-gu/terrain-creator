import MapboxDraw from '@mapbox/mapbox-gl-draw'
import { useAtom, useSetAtom } from 'jotai'
import { useCallback, useEffect } from 'react'
import { useControl } from 'react-map-gl'
import {
  featuresAtom,
  mapDrawModeAtom,
  mapModeAtom,
  refreshTilesAtom,
} from '../../state'
import axios from 'axios'

export default function DrawControl(props) {
  const setMapMode = useSetAtom(mapDrawModeAtom)
  const [features, setFeatures] = useAtom(featuresAtom)

  const onUpdate = useCallback((e) => {
    setFeatures((currFeatures) => {
      const newFeatures = { ...currFeatures }
      for (const f of e.features) {
        newFeatures[f.id] = f
      }
      return newFeatures
    })
  }, [])

  const onDelete = useCallback((e) => {
    setFeatures((currFeatures) => {
      const newFeatures = { ...currFeatures }
      for (const f of e.features) {
        delete newFeatures[f.id]
      }
      return newFeatures
    })
  }, [])

  const control = useControl(
    () => new MapboxDraw(props),
    ({ map }) => {
      map.on('draw.create', onUpdate)
      map.on('draw.update', onUpdate)
      map.on('draw.delete', onDelete)
      map.on('draw.modechange', (e) => {
        setMapMode(e.mode)
      })
    },
    ({ map }) => {
      map.off('draw.create', onUpdate)
      map.off('draw.update', onUpdate)
      map.off('draw.delete', onDelete)
    },
    {
      position: props.position,
    }
  )

  useEffect(() => {
    if (Object.keys(features).length === 0) {
      control.deleteAll()
    }
  }, [control, features])

  return null
}

DrawControl.defaultProps = {
  onCreate: () => {},
  onUpdate: () => {},
  onDelete: () => {},
}
