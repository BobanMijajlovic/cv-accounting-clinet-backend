import 'reflect-metadata'
import {
    Arg,
    Ctx,
    Field,
    ID,
    Int,
    Mutation,
    ObjectType,
    Query,
    Resolver,
    UseMiddleware
}                       from 'type-graphql'
import {
    AutoIncrement,
    Column,
    CreatedAt,
    DataType,
    ForeignKey,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt
}                       from 'sequelize-typescript'
import * as validations from './validations'
import {modelSTATUS}    from './validations'
import Client           from './Client.model'
import {
    createBaseResolver,
    IContextApp,
    TModelResponse
}                       from '../graphql/resolvers/basic'
import {SettingsType}   from '../graphql/types/Client'
import {checkJWT}       from '../graphql/middlewares'
import Item             from './Item.model'
import {ItemImageType}  from '../graphql/types/Item'
import config           from '../../../config'

@ObjectType()
@Table({
    tableName: 'settings'
})

export default class Settings extends Model {

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
        type: DataType.STRING(64),
        validate: {
            isValid: (value) => validations.checkTrimString('Settings', 'key', 'not allowed blanks', value)
        }
    })
    key: string

    @Field()
    @Column({
        allowNull: false,
        type: DataType.STRING(1024)
    })
    value: string

    @Field(type => Int, {nullable: true})
    @Column({
        allowNull: false,
        type: DataType.TINYINT,
        defaultValue: modelSTATUS.ACTIVE,
        validate: {
            isValid: (value) => validations.isStatusValid('Settings', value)
        }
    })

    status: number

    @Field(type => Int)
    @ForeignKey(() => Client)
    @Column({
        allowNull: true,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_client_id'
    })
    clientId: number

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

    public static async selectOneByKey (key: string): TModelResponse<Settings> {
        return Settings.findOne({
            where: {
                key
            }
        })
    }

    public static async selectOneByKeyCtx (key: string, ctx: IContextApp): TModelResponse<Settings> {
        return Settings.findOne({
            where: {
                key,
                clientId: ctx.clientId
            }
        })
    }

    public static async updateByKey (key: string,data: SettingsType, ctx: IContextApp): TModelResponse<Settings> {
        const settings = await Settings.findOne({
            where: {
                key,
                clientId: ctx.clientId
            }
        })
        if (!settings) {
            throw Error('Client settings not found')
        }
        await settings.update(data)
        return Settings.findByPk(settings.id)
    }

    public static async updateOne (id: number, data: SettingsType, ctx: IContextApp): TModelResponse<Settings> {
        const settings = await Settings.findOne({
            where: {
                id,
                clientId: ctx.clientId
            }
        })
        if (!settings) {
            throw Error('Client settings not found')
        }
        await settings.update(data)
        return Settings.findByPk(id)
    }

}
const BaseResolver = createBaseResolver(Settings, {
    updateInputType: SettingsType,
    insertInputType: SettingsType
})

@Resolver()
export class SettingsResolver extends BaseResolver {

    @UseMiddleware(checkJWT)
    @Query(returns => Settings, {nullable: true, name: 'settingByKey'})
    _settingByKey (@Arg('key') key: string,
        @Ctx() ctx: IContextApp) {
        return Settings.selectOneByKeyCtx(key,ctx)
    }

    @Mutation(returns => Settings, {nullable: true, name: 'updateSettingsByKey'})
    _updateSettingsByKey (@Arg('key') key: string,
        @Arg('data',type => SettingsType) data: SettingsType,
        @Ctx() ctx: IContextApp) {
        return Settings.updateByKey(key,data,ctx)
    }

}
