export const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
  })
}

export const convertDataUrlToBlob = (dataUrl) => {
  // Split the data URL at the comma to get the base64 encoded data
  const parts = dataUrl.split(',')
  const base64Data = parts[1]
  const contentType = parts[0].split(':')[1].split(';')[0]

  // Convert base64 to raw binary data held in a string
  const byteCharacters = atob(base64Data)
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }

  // Convert to an array of bytes
  const byteArray = new Uint8Array(byteNumbers)

  // Create a blob from the byte array
  const blob = new Blob([byteArray], { type: contentType })
  return blob
}

export const imageFromCanvas = (canvasInstance) => {
  return new Promise((resolve) => {
    const drawnImageData = canvasInstance.getDataURL()
    const drawnImage = new Image()

    const bgImageData = canvasInstance.canvas.grid.toDataURL('image/png')
    const bgImage = new Image()

    // Counter for loaded images
    let imagesLoaded = 0

    // Once all images are loaded, draw them
    const onImageLoaded = () => {
      imagesLoaded++
      if (imagesLoaded === 2) {
        const canvas = document.createElement('canvas')
        canvas.width = 1024
        canvas.height = 1024
        const ctx = canvas.getContext('2d')
        ctx.drawImage(bgImage, 0, 0, 1024, 1024)
        ctx.drawImage(drawnImage, 0, 0, 1024, 1024)
        const image = canvas.toDataURL('image/png')
        resolve(image)
      }
    }

    // Set up the load events
    drawnImage.onload = onImageLoaded
    bgImage.onload = onImageLoaded

    // Start loading the images
    drawnImage.src = drawnImageData
    bgImage.src = bgImageData
  })
}

export default formatDate
