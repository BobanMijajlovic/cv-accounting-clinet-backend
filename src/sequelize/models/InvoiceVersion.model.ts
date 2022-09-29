import 'reflect-metadata'
import {
    AutoIncrement,
    Column,
    CreatedAt,
    DataType,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt
}                           from 'sequelize-typescript'
import {
    Field,
    ID,
    Int,
    ObjectType,
    Resolver
}                           from 'type-graphql'
import * as validations     from './validations'
import {modelSTATUS}        from './validations'
import {
    createBaseResolver,
    IContextApp,
    TModelResponse,
    TModelResponseSelectAll
}                           from '../graphql/resolvers/basic'
import {InvoiceVersionType} from '../graphql/types/Invoice'

@ObjectType()
@Table({
    tableName: 'invoice_version'
})

export default class InvoiceVersion extends Model {

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
        type: DataType.STRING(32),
        comment: 'name for user to be seen',
        field: 'name'
    })
    name: string

    @Field({nullable: true})
    @Column({
        allowNull: true,
        type: DataType.STRING(255)
    })
    description: string

    @Field(type => Int)
    @Column({
        allowNull: false,
        type: DataType.TINYINT,
        defaultValue: modelSTATUS.ACTIVE,
        validate: {
            isValid: (value) => validations.isStatusValid.bind(null, 'InvoiceVersion')(value)
        }
    })
    status: number

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

    public static async selectOne (id: number, ctx?: IContextApp): TModelResponse<InvoiceVersion> {
        return InvoiceVersion.findOne({
            where: {
                id
            }
        })
    }

    public static async insertOne (data: InvoiceVersionType, ctx?: IContextApp): TModelResponse<InvoiceVersion> {
        const invoice = await InvoiceVersion.create(data)
        return InvoiceVersion.selectOne(invoice.id)
    }

    public static async updateOne (id: number, data: InvoiceVersionType, ctx?: IContextApp): TModelResponse<InvoiceVersion> {
        const invoice = await InvoiceVersion.findOne({where: {id}})
        if (!invoice) {
            throw Error('Type not in system')
        }
        await invoice.update(data)
        return InvoiceVersion.selectOne(id)
    }

    public static selectAll (options: any, _ctx?: IContextApp): TModelResponseSelectAll<InvoiceVersion> {
        return InvoiceVersion.findAndCountAll(options)
    }
}

const BaseResolver = createBaseResolver(InvoiceVersion, {
    updateInputType: InvoiceVersionType,
    insertInputType: InvoiceVersionType
})

@Resolver()
export class InvoiceTypeResolver extends BaseResolver {}

