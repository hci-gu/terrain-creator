import MapboxDraw from '@mapbox/mapbox-gl-draw'
import { useAtom, useSetAtom } from 'jotai'
import { useCallback, useEffect } from 'react'
import { useControl } from 'react-map-gl'
import { featuresAtom, mapDrawModeAtom } from '../../state'

export default function DrawControl({
  onCreate = () => {},
  onUpdate = () => {},
  onDelete = () => {},
  ...props
}) {
  const setMapDrawMode = useSetAtom(mapDrawModeAtom)
  const [features, setFeatures] = useAtom(featuresAtom)

  const onUpdateCallback = useCallback((e) => {
    setFeatures((currFeatures) => {
      const newFeatures = { ...currFeatures }
      for (const f of e.features) {
        newFeatures[f.id] = f
      }
      return newFeatures
    })
  }, [])

  const onDeleteCallback = useCallback((e) => {
    setFeatures((currFeatures) => {
      const newFeatures = { ...currFeatures }
      for (const f of e.features) {
        delete newFeatures[f.id]
      }
      return newFeatures
    })
  }, [])

  const control = useControl(
    () => new MapboxDraw({
      ...props
    }),
    ({ map }) => {
      map.on('draw.create', onUpdateCallback)
      map.on('draw.update', onUpdateCallback)
      map.on('draw.delete', onDeleteCallback)
      map.on('draw.modechange', (e) => {
        setMapDrawMode(e.mode)
      })
    },
    ({ map }) => {
      map.off('draw.create', onUpdateCallback)
      map.off('draw.update', onUpdateCallback)
      map.off('draw.delete', onDeleteCallback)
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
