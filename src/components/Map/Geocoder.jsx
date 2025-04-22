import * as React from 'react'
import { useState } from 'react'
import { useControl } from 'react-map-gl'
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'

export default function GeocoderControl({
  marker = true,
  onLoading = () => {},
  onResults = () => {},
  onResult = () => {},
  onError = () => {},
  ...props
}) {
  const [geocoderMarker, setMarker] = useState(null)

  const geocoder = useControl(
    () => {
      const ctrl = new MapboxGeocoder({
        ...props,
        marker: false,
        accessToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN,
      })
      ctrl.on('loading', onLoading)
      ctrl.on('results', onResults)
      ctrl.on('result', (evt) => {
        onResult(evt)
      })
      ctrl.on('error', onError)
      return ctrl
    },
    {
      position: props.position,
    }
  )

  if (geocoder._map) {
    if (
      geocoder.getProximity() !== props.proximity &&
      props.proximity !== undefined
    ) {
      geocoder.setProximity(props.proximity)
    }
    if (
      geocoder.getRenderFunction() !== props.render &&
      props.render !== undefined
    ) {
      geocoder.setRenderFunction(props.render)
    }
    if (
      geocoder.getLanguage() !== props.language &&
      props.language !== undefined
    ) {
      geocoder.setLanguage(props.language)
    }
    if (geocoder.getZoom() !== props.zoom && props.zoom !== undefined) {
      geocoder.setZoom(props.zoom)
    }
    if (geocoder.getFlyTo() !== props.flyTo && props.flyTo !== undefined) {
      geocoder.setFlyTo(props.flyTo)
    }
    if (
      geocoder.getPlaceholder() !== props.placeholder &&
      props.placeholder !== undefined
    ) {
      geocoder.setPlaceholder(props.placeholder)
    }
    if (
      geocoder.getCountries() !== props.countries &&
      props.countries !== undefined
    ) {
      geocoder.setCountries(props.countries)
    }
    if (geocoder.getTypes() !== props.types && props.types !== undefined) {
      geocoder.setTypes(props.types)
    }
    if (
      geocoder.getMinLength() !== props.minLength &&
      props.minLength !== undefined
    ) {
      geocoder.setMinLength(props.minLength)
    }
    if (geocoder.getLimit() !== props.limit && props.limit !== undefined) {
      geocoder.setLimit(props.limit)
    }
    if (geocoder.getFilter() !== props.filter && props.filter !== undefined) {
      geocoder.setFilter(props.filter)
    }
    if (geocoder.getOrigin() !== props.origin && props.origin !== undefined) {
      geocoder.setOrigin(props.origin)
    }
    // Types missing from @types/mapbox__mapbox-gl-geocoder
    // Commented out properties as these are not part of the official type definitions
    // if (geocoder.getAutocomplete() !== props.autocomplete && props.autocomplete !== undefined) {
    //   geocoder.setAutocomplete(props.autocomplete);
    // }
    // if (geocoder.getFuzzyMatch() !== props.fuzzyMatch && props.fuzzyMatch !== undefined) {
    //   geocoder.setFuzzyMatch(props.fuzzyMatch);
    // }
    // if (geocoder.getRouting() !== props.routing && props.routing !== undefined) {
    //   geocoder.setRouting(props.routing);
    // }
    // if (geocoder.getWorldview() !== props.worldview && props.worldview !== undefined) {
    //   geocoder.setWorldview(props.worldview);
    // }
  }
  return geocoderMarker
}

const noop = () => {}

GeocoderControl.defaultProps = {
  marker: true,
  onLoading: noop,
  onResults: noop,
  onResult: noop,
  onError: noop,
}
