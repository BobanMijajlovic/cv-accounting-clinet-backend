import 'reflect-metadata'
import {
    Field,
    ID,
    Int,
    ObjectType,
    Resolver
}                                   from 'type-graphql'
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
}                                   from 'sequelize-typescript'
import {
    createBaseResolver,
    IContextApp,
    TModelResponse,
    TModelResponseSelectAll
}                                   from '../graphql/resolvers/basic'
import {CONSTANT_MODEL}             from '../constants'
import {ApplicationDataType}        from '../graphql/types/Application'
import {setUserFilterToWhereSearch} from './index'
import Client                       from './Client.model'
import * as GraphQLJSON from 'graphql-type-json'

@ObjectType()
@Table({
    tableName: 'application_data'
})

export default class ApplicationData extends Model {

    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column({
        type: DataType.INTEGER.UNSIGNED
    })
    id: number

    @Field()
    @Column({
        allowNull: false,
        type: DataType.STRING(64)
    })
    key: string

    @Field({nullable: true})
    @Column({
        allowNull: true,
        type: DataType.STRING(256),
        defaultValue: ''
    })
    value: string

    @Field(type => GraphQLJSON.default, {nullable: true})
    @Column({
        allowNull: true,
        field: 'value_json',
        comment: 'For complex settings',
        type: DataType.JSON
    })
    valueJSON: object

    @Field(type => Int,{nullable:true})
    @Column({
        allowNull: true,
        type: DataType.TINYINT,
        defaultValue: CONSTANT_MODEL.STATUS.ACTIVE
    })
    status: number

    @Field(type => Int, {nullable: true})
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

    public static async selectAll (options: any, ctx?: IContextApp): TModelResponseSelectAll<ApplicationData> {
        options = setUserFilterToWhereSearch(options, ctx)
        return ApplicationData.findAndCountAll(options)
    }

    public static async insertOne (data: ApplicationDataType,ctx: IContextApp): TModelResponse<ApplicationData> {
        const appData = await ApplicationData.create({
            ...data,
            clientId: ctx.clientId
        })

        if (!appData) {
            throw Error('Application data insert not working')
        }
        return ApplicationData.findByPk(appData.id)
    }

    public static async updateOne (id: number,data: ApplicationDataType,ctx: IContextApp): TModelResponse<ApplicationData> {
        const applicationData = await ApplicationData.findOne({
            where: {
                id,
                clientId: ctx.clientId
            }
        })
        if (!applicationData) {
            throw ('Application data not exists')
        }
        await applicationData.update(data)
        return ApplicationData.findByPk(id)
    }

}

const BaseResolver = createBaseResolver(ApplicationData,{
    updateInputType: ApplicationDataType,
    insertInputType: ApplicationDataType
})

@Resolver()
export class ApplicationDataResolver extends BaseResolver {}

