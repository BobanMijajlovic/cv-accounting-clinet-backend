import 'reflect-metadata'
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
}                       from 'sequelize-typescript'
import {
    Field,
    ID,
    Int,
    ObjectType
}                       from 'type-graphql'
import BankTransactions from './BankTransactions.model'

@ObjectType()
@Table({
    tableName: 'bank_transaction_additional_data',
    underscored: true,
})

export default class BankTransactionAdditionalData extends Model {

    @Field(type => ID)
    @PrimaryKey
    @AutoIncrement
    @Column({
        type: DataType.INTEGER.UNSIGNED
    })
    id: number

    @Field({nullable: true})
    @Column({
        allowNull: true,
        type: DataType.STRING(100),
        field: 'account_number'
    })
    accountNumber: string

    @Field({nullable: true})
    @Column({
        allowNull: true,
        type: DataType.STRING(100),
        field: 'model_string'
    })
    modelString: string

    @Field({nullable: true})
    @Column({
        allowNull: true,
        type: DataType.STRING(128),
        comment: 'svrha placanja'
    })
    description: string

    @Field({nullable: true})
    @Column({
        allowNull: true,
        type: DataType.STRING(64),
        field: 'transaction_key'
    })
    transactionKey: string

    @Field({nullable: true})
    @Column({
        allowNull: true,
        type: DataType.STRING(16),
        comment: 'sifra_placanja'
    })
    code: string

    @Field(type => Int)
    @ForeignKey(() => BankTransactions)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_bank_transactions_id'
    })
    bankTransactionsId: number

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

}

