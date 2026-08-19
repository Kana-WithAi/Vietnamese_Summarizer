export const getFileDimensions = (file) => {
  return new Promise((resolve) => {
    if (file && file.type && file.type.startsWith('image/')) {
      const img = new Image()
      const objectUrl = URL.createObjectURL(file)

      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight })
        URL.revokeObjectURL(objectUrl)
      }

      img.onerror = () => {
        resolve(null)
        URL.revokeObjectURL(objectUrl)
      }

      img.src = objectUrl
      return
    }

    resolve(null)
  })
}
