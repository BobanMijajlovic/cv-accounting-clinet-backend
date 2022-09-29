import 'reflect-metadata'
import {
    Field,
    ID,
    Int,
    ObjectType
}                                 from 'type-graphql'
import {
    AutoIncrement,
    BelongsTo,
    Column,
    CreatedAt,
    DataType,
    ForeignKey,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt
}                                 from 'sequelize-typescript'
import {
    Item,
    throwArgumentValidationError
}                                 from './index'
import {
    CONSTANT_MODEL,
    IMAGE_TYPES
}                                 from '../constants'
import {IContextApp}              from '../graphql/resolvers/basic'
import {UploadType}               from '../graphql/types/Client'
import {
    deleteFileFromDrive,
    uploadFileGoogleDrive
}                                 from '../../google-api/GoogleAPI'
import config                     from '../../../config'
import {TGoogleDriveFileResponse} from '../../google-api/d'
import {ItemImageType}            from '../graphql/types/Item'

@ObjectType()
@Table({
    tableName: 'items_images',
    underscored: true,
})

export default class ItemsImages extends Model {

    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column({
        type: DataType.INTEGER.UNSIGNED,
    })
    id: number

    @Field()
    @Column({
        allowNull: false,
        type: DataType.STRING(256),
        field: 'google_id'
    })
    googleId: string

    @Field()
    @Column({
        allowNull: false,
        type: DataType.STRING(256)
    })
    url: string

    @Field()
    @Column({
        allowNull: false,
        type: DataType.STRING(256)
    })
    name: string

    @Field(type => Int, {nullable: true})
    @Column({
        allowNull: true,
        type: DataType.TINYINT,
        defaultValue: IMAGE_TYPES.PRIMARY
    })
    type: number

    @Field(type => Int, {nullable: true})
    @Column({
        allowNull: true,
        type: DataType.INTEGER,
        defaultValue: 0
    })
    size: number

    @Field(type => Int, {nullable: true})
    @Column({
        allowNull: true,
        type: DataType.TINYINT,
        defaultValue: CONSTANT_MODEL.STATUS.ACTIVE
    })
    status: number

    @Field(type => Int)
    @ForeignKey(() => Item)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_item_id'
    })
    itemId: number

    @Field()
    @CreatedAt
    @Column({
        field: 'created_at'
    })
    createdAt: Date

    @Field()
    @UpdatedAt
    @Column({
        field: 'updated_at'
    })
    updatedAt: Date

    @Field(type => Item, {nullable: true})
    @BelongsTo(() => Item)
    item: Item

    public static async deleteItemImage (id: number, ctx: IContextApp, options: any) {
        const itemImage = await ItemsImages.findOne({
            where: {
                id
            },
            ...options
        })
        if (!itemImage) {
            throwArgumentValidationError('id', {}, {message: 'Image not exists.'})
        }
        const fileId = itemImage.googleId
       /* const {googleDriveViewUrlPath} = config
        const fileId = itemImage.url.replace(googleDriveViewUrlPath, '')*/
        if (fileId) {
            await deleteFileFromDrive(fileId)
        }
        await itemImage.destroy(options)
    }

    public static async insertItemImage (itemId: number, image: UploadType, ctx: IContextApp, options: any) {
        const {GOOGLE} = config
        const fileData = await uploadFileGoogleDrive(image, GOOGLE.googleDriveFolderItemId) as TGoogleDriveFileResponse
        await ItemsImages.create({
            name: fileData.name,
            googleId: fileData.id,
            url: `${GOOGLE.driveThumbnailUrlPath}${fileData.id}`,
            itemId,
            type: IMAGE_TYPES.PRIMARY,
            size: BigInt(fileData.size)
        }, options)
    }

    public static async insertUpdateImages ( data: ItemImageType) {
        const transaction = await Item.sequelize.transaction()
        const options = {transaction}
        try {
            const itemImage = await ItemsImages.findOne({
                where: {
                    itemId: data.itemId
                },
                ...options
            })
            if (itemImage && itemImage.id) {
                const fileId = itemImage.googleId
                if (fileId) {
                    await deleteFileFromDrive(fileId)
                }
                await itemImage.destroy(options)
            }
            await ItemsImages.create({
                ...data,
            },options)
            await transaction.commit()
            return true
        } catch (e) {
            transaction.rollback()
            throw (e)
        }
    }
}

