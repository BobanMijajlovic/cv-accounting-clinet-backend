import {
    AutoIncrement,
    Column,
    CreatedAt,
    DataType,
    Model,
    PrimaryKey,
    Table,
    UpdatedAt
} from 'sequelize-typescript'

import {
    Field,
    ID,
    ObjectType
}                from 'type-graphql'
import Sequelize from 'sequelize'

@Table({
    tableName: 'email'

})
@ObjectType()
export default class Email extends Model<Email> {
    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column({
        type: DataType.INTEGER
    })
    id: number

    @Field()
    @Column({
        allowNull: false,
        type: DataType.STRING(256)
    })
    subject: string

    @Field()
    @Column({
        allowNull: false,
        type: DataType.STRING(512)
    })
    to: string

    @Column({
        allowNull: false,
        type: DataType.STRING(4096)
    })
    body: string

    @Field()
    @Column({
        allowNull: false,
        field: 'number_try_to_send',
        defaultValue: 0
    })
    numTryToSend: number

    @Field()
    @Column({
        allowNull: false,
        defaultValue: 0
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

    public static async insertOne (to: string, subject: string, data: string) {
        await Email.create({
            to: to,
            subject: subject,
            body: data,
        })
    }

    public static async getNotSent () {
        return Email.findOne({
            where: {
                status: 0,
                numTryToSend: {
                    [Sequelize.Op.lte]: 6
                }
            },
            order: [
                ['numTryToSend', 'ASC']
            ]
        })
    }
}
