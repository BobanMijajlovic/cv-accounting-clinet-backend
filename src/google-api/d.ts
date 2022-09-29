
export type TGoogleDriveFileResponse = {
    id: string,
    name: string
    mimeType: string
    parents?: string[],
    webContentLink: string
    webViewLink: string
    iconLink: string
    thumbnailLink: string
    fileExtension: string
    size: string
}