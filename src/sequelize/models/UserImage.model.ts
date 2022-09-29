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
import {UserImageType}            from '../graphql/types/Item'
import User                       from './User.model'

@ObjectType()
@Table({
    tableName: 'user_image',
    underscored: true,
})

export default class UserImage extends Model {

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
    @ForeignKey(() => User)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_user_id'
    })
    userId: number

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

    @Field(type => User, {nullable: true})
    @BelongsTo(() => User)
    user: User

    public static async deleteUserImage (id: number, ctx: IContextApp, options: any) {
        const userImg = await UserImage.findOne({
            where: {
                id
            },
            ...options
        })
        if (!userImg) {
            throwArgumentValidationError('id', {}, {message: 'Image not exists.'})
        }
        const fileId = userImg.googleId
        if (fileId) {
            await deleteFileFromDrive(fileId)
        }
        await userImg.destroy(options)
    }

    public static async insertUserImage (userId: number, image: UploadType, ctx: IContextApp, options: any) {
        const {GOOGLE} = config
        const fileData = await uploadFileGoogleDrive(image, GOOGLE.googleDriveFolderUserId) as TGoogleDriveFileResponse
        await UserImage.create({
            name: fileData.name,
            googleId: fileData.id,
            url: `${GOOGLE.driveThumbnailUrlPath}${fileData.id}`,
            userId,
            type: IMAGE_TYPES.PRIMARY,
            size: BigInt(fileData.size)
        }, options)
    }

    public static async insertUpdateImages (data: UserImageType) {
        const transaction = await Item.sequelize.transaction()
        const options = {transaction}
        try {
            const userImage = await UserImage.findOne({
                where: {
                    userId: data.userId
                },
                ...options
            })
            if (userImage && userImage.id) {
                const fileId = userImage.googleId
                if (fileId) {
                    await deleteFileFromDrive(fileId)
                }
                await userImage.destroy(options)
            }
            await UserImage.create({
                ...data,
            }, options)
            await transaction.commit()
            return true
        } catch (e) {
            transaction.rollback()
            throw (e)
        }
    }

}

