import {google}                   from 'googleapis'
import readline                   from 'readline'
import fs                         from 'fs'
import config                     from '../config'
import {UploadType}               from '../sequelize/graphql/types/Client'
import {encryptImageData}         from '../sequelize/models/Item.model'
import GoogleDrive                from '../../config/GoogleDrive.json'
import {TGoogleDriveFileResponse} from './d'
import images                     from './images.json'
import ItemsImages                from '../sequelize/models/ItemsImages.model'
const { Readable } = require('stream')

/** ovo treba da se prepravi */
const CLIENT_ID = '823897790066-q0uqae1tk9k0cb4lhadngcihto2lk644.apps.googleusercontent.com'
const CLIENT_SECRET = 'BQymOae8KCoyVj-QN_QmzPcU'
const REDIRECT_URI = 'https://developers.google.com/oauthplayground'
const REFRESH_TOKEN = '1//04DaA6NivyWQACgYIARAAGAQSNwF-L9Ir6kg_UOqXtGaRtdMPsfMCJhtKGLZtjze8o2pyChZsdTO73oSQzsr9UtNa6m0yneQl16U'

const scopes = ['https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.metadata',
    'https://www.googleapis.com/auth/drive.install',
    'https://www.googleapis.com/auth/drive.apps.readonly'
]

const loginToDrive = async () => {

        // eslint-disable-next-line @typescript-eslint/camelcase
    const {client_email, private_key} = GoogleDrive
    const jwtClient = new google.auth.JWT({
        email: client_email,
        key: private_key,
        scopes
    })
    jwtClient.authorize(function(err, tokens) {
        if (err) {
            console.log(err)
            return
        }
    })
    const drive = await google.drive({
        version: 'v3'
    })
    return  {
        drive,
        jwtClient
    }
}
export type TIonicUploadFile = {
    name: string,
    data: Buffer,
    size: number,
    encoding: string,
    tempFilePath: string
    truncated: boolean
    mimetype: string
    md5: string
}

const bufferToStream = (buffer) => {
    const stream = new Readable()
    stream.push(buffer)
    stream.push(null)

    return stream
}

export const uploadFileFromBuffer = async (file: TIonicUploadFile, folderId: string) => {
    const {drive,jwtClient} = await loginToDrive()

    try {
        const { name: filename,mimetype, encoding, data} = await file

       // const stream =  Readable.from(data.toString())
        const hash = await encryptImageData({
            filename,
            mimetype,
            encoding,
            time: new Date().getTime()
        })
        const body = {
            mimeType: mimetype,
            name: hash
        }
        /** drive folder DealApp */
        const response = await drive.files.create({
            auth: jwtClient,
            requestBody: {
                name: body.name,
                parents: [folderId]
            },
            media: {
                mimeType: body.mimeType,
                body: bufferToStream(data)
            }
        })

        await drive.permissions.create({
            auth: jwtClient,
            requestBody: {
                type: 'anyone',
                role: 'reader'
            },
            fileId: response.data.id,
            fields: 'id'
        })

        const gDriveFile = await drive.files.get({
            auth: jwtClient,
            fileId: response.data.id,
            fields : 'id,name,mimeType,parents,size,thumbnailLink,webContentLink,webViewLink'
        })
        return gDriveFile.data as TGoogleDriveFileResponse
    } catch (e) {
        throw (e.message)
    }
}

/** new google api config */
export const uploadFileGoogleDrive = async (file: UploadType,folderId: string) => {

    const {drive,jwtClient} = await loginToDrive()
    try {
        const {createReadStream, mimetype, encoding, filename} = await file
        const hash = await encryptImageData({
            filename,
            mimetype,
            encoding,
            time: new Date().getTime()
        })

        const body = {
            mimeType: mimetype,
            name: hash
        }
        /** drive folder DealApp */
        const response = await drive.files.create({
            auth: jwtClient,
            requestBody: {
                name: body.name,
                parents: [folderId]
            },
            media: {
                mimeType: body.mimeType,
                body: createReadStream()
            }
        })

        await drive.permissions.create({
            auth: jwtClient,
            requestBody: {
                type: 'anyone',
                role: 'reader'
            },
            fileId: response.data.id,
            fields: 'id,thumbnailLink,webContentLink,webViewLink'
        })

        const gDriveFile = await drive.files.get({
            auth: jwtClient,
            fileId: response.data.id,
            fields : 'id,name,mimeType,parents,size,thumbnailLink,webContentLink,webViewLink'
        })
        return gDriveFile.data as TGoogleDriveFileResponse
    } catch (e) {
        throw (e.message)
    }
}

export const deleteFileFromDrive = async (fileId: string) => {
    const {drive,jwtClient} = await loginToDrive()
    try {
        await drive.files.delete({
            auth: jwtClient,
            fileId: fileId
        })
    } catch (e) {
        throw (e.message)
    }
}

export const fixItemsDataBase = async (data) => {
    // const {drive,jwtClient} = await loginToDrive()
    try {
        /* const response =  await drive.files.list({
            auth: jwtClient,
            pageSize : 100,
            fields : 'nextPageToken, files(contentHints/thumbnail,fileExtension,iconLink,id,name,size,thumbnailLink,webContentLink,webViewLink,mimeType,parents)',
            q : '\'17IbaCl8gHAUTZDXmVssJk4m1cC5Ldxzn\' in parents'
        })*/

        /** needs for get current data */
       /* const _items = await ItemsImages.findAll()
        const items =  _items.map(x => {
            return {
                name: x.name,
                url:x.url,
                googleId: x.googleId,
                size: x.size,
                type: x.type,
                status: x.status,
                itemId: x.itemId
            }
        })
        await fs.writeFileSync(`${__dirname}/images.json`, JSON.stringify(items))*/

        const transaction = await ItemsImages.sequelize.transaction()
        const options = {transaction}
        try {
            await ItemsImages.create(data,options)
            await transaction.commit()
        } catch (e) {
            transaction.rollback()
            throw (e)
        }

    } catch (e) {
        throw (e.message)
    }

}
