const convertDataUrlToBlob = (dataUrl) => {
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

export default convertDataUrlToBlob
