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
}                                     from 'sequelize-typescript'
import {
    Arg,
    Ctx,
    Field,
    ID,
    Int,
    Mutation,
    ObjectType,
    Resolver,
    UseMiddleware
}                                     from 'type-graphql'
import {
    CALCULATION_ITEM_TYPE,
    CONSTANT_MODEL
}                                     from '../constants'
import * as validations               from './validations'
import ItemSupplier                   from './ItemSupplier.model'
import Item                           from './Item.model'
import Tax                            from './Tax.model'
import Calculation                    from './Calculation.model'
import {throwArgumentValidationError} from './index'
import {checkJWT}                     from '../graphql/middlewares'
import {IContextApp}                  from '../graphql/resolvers/basic'
import {CalculationItemType}          from '../graphql/types/Calculation'
import _                              from 'lodash'

@ObjectType()
@Table({
    tableName: 'calculation_item'
})

export default class CalculationItem extends Model {
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
        type: DataType.INTEGER.UNSIGNED,
        field: 'position_number'
    })
    posNumber: number

    /** this is value in % for that tax */
    @Field({nullable: false})
    @Column({
        allowNull: false,
        type: DataType.DECIMAL(10, 2),
        field: 'tax_percent'
    })
    taxPercent: number

    @Field({nullable: false})
    @Column({
        allowNull: false,
        type: DataType.DECIMAL(10, 3)
    })
    quantity: number

    @Field({nullable: true})
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(10, 2),
        field: 'finance_vp'
    })
    financeVP: number

    @Field({nullable: true})
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(10, 2),
        field: 'finance_mp'
    })
    financeMP: number

    @Field({nullable: true})
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(10, 2),
        comment: 'total finance vp after internal expanses added',
        field: 'finance_exp_internal_vp'
    })
    financeExpInternalVP: number

    @Field({nullable: true})
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(10, 2),
        comment: 'total finance mp after internal expanses added',
        field: 'finance_exp_internal_mp'
    })
    financeExpInternalMP: number

    @Field({nullable: true})
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(10, 2),
        field: 'finance_final_vp'
    })
    financeFinalVP: number

    @Field({nullable: true})
    @Column({
        allowNull: true,
        defaultValue: 0,
        type: DataType.DECIMAL(10, 2),
        field: 'finance_final_mp'
    })
    financeFinalMP: number

    @Field(type => Int)
    @ForeignKey(() => Calculation)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_calculation_id'
    })
    calculationId: number

    @Field(type => Int)
    @ForeignKey(() => Item)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_item_id'
    })
    itemId: number

    @Field(type => Int)
    @ForeignKey(() => Tax)
    @Column({
        allowNull: false,
        type: DataType.INTEGER.UNSIGNED,
        field: 'fk_tax_id'
    })
    taxId: number

    @Field(type => Int, {nullable: true})
    @ForeignKey(() => ItemSupplier)
    @Column({
        allowNull: true,
        field: 'fk_supplier_item_id'
    })
    supplierItemId: number

    @Field(type => Int, {nullable: true})
    @Column({
        allowNull: false,
        type: DataType.TINYINT,
        defaultValue: CONSTANT_MODEL.STATUS.ACTIVE,
        validate: {
            isValid: (value) => validations.isStatusValid.bind(null, 'CalculationItem')(value)
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

    /** relations*/

    @Field(type => Calculation)
    @BelongsTo(() => Calculation)
    calculation: Calculation

    @Field(type => Item)
    @BelongsTo(() => Item)
    item: Item

    @Field(type => ItemSupplier)
    @BelongsTo(() => ItemSupplier)
    itemSupplier: ItemSupplier

    @Field(type => Tax)
    @BelongsTo(() => Tax)
    tax: Tax

    private _calculateValues = (calculation: Calculation) => {
        const totalExpensesInternal = calculation.totalExpenseInternal()
        const totalFinanceItems = _.round(_.subtract(calculation.totalFinanceMP, totalExpensesInternal),2)
        const relation = _.divide(this.financeMP, totalFinanceItems)
        if (totalExpensesInternal == 0) {
            this.financeExpInternalVP = this.financeVP
            this.financeExpInternalMP = this.financeMP
        } else {
            this.financeExpInternalMP = _.round(_.add(this.financeMP, _.round(_.multiply(totalExpensesInternal, relation),2)), 2) // + _.random(-0.5,0.5,true)
            const taxBase = _.round(_.subtract(totalExpensesInternal, calculation.totalExpenseInternalTax()), 2)
            this.financeExpInternalVP = _.round(_.add(this.financeVP, _.multiply(taxBase, relation)), 2)
        }

        const totalExpensesExternal = calculation.totalExpenseExternal()

        if (totalExpensesExternal === 0) {
            this.financeFinalMP = this.financeExpInternalMP
            this.financeFinalVP = this.financeExpInternalVP
        } else {
            this.financeFinalMP = _.round(_.add(this.financeExpInternalMP, _.multiply(totalExpensesExternal, relation)), 2)
            const taxBase = _.round(_.subtract(totalExpensesExternal, calculation.totalExpenseExternalTax()), 2)
            this.financeFinalVP = _.round(_.add(this.financeExpInternalVP, _.multiply(taxBase, relation)), 2)
        }
    }

    /** in this case finance no vat are well known */
    private calculateValuesFinanceNoTax = (calculation: Calculation) => {
        this.financeMP = _.round(_.divide(_.multiply(this.financeVP, _.add(100, Number(this.taxPercent))), 100), 2)
        this._calculateValues(calculation)
    }

    private calculateValuesFinanceWithTax = (calculation: Calculation) => {
        this.financeVP = _.round(_.divide(_.multiply(this.financeMP, 100), _.add(100, Number(this.taxPercent))), 2)
        this._calculateValues(calculation)
    }

    public calculateMissingValues = (calculation: Calculation) => {
        switch (calculation.itemInputType) {
            case CALCULATION_ITEM_TYPE.FINANCE_WITH_VAT:
                this.calculateValuesFinanceWithTax(calculation)
                break
            default:
                this.calculateValuesFinanceNoTax(calculation) /** fix all values for price and vats */
                break
        }
    }

    public static async insertUpdateOne (calcId: number, data: CalculationItemType, id: number, ctx: IContextApp): Promise<Calculation> {

        const validTaxes = await Tax.getValidTax(ctx)
        if (!validTaxes) {
            throw Error('Vats not exists in system')
        }

        const transaction = await CalculationItem.sequelize.transaction()

        if (!transaction) {
            throw Error('Transaction can\'t be open')
        }
        const options = {transaction, validate: true}
        try {

            const calculation = await Calculation.findOne({
                where: {
                    id: calcId,
                    clientId: ctx.clientId,
                    status: CONSTANT_MODEL.CALCULATION_STATUS.OPENED, /** for now **/
                },
                include: Calculation.includeOptions(),
                ...options
            })

            if (!calculation) {
                throwArgumentValidationError('id', {}, {message: 'Calculation not editable'})
            }

            let calcItem = void(0)

            if (!id) {
                /** then we insert new item */

                const item = await Item.findOne({
                    where: {
                        id: data.itemId,
                        clientId: ctx.clientId
                    },
                    ...options
                })

                if (!item) {
                    throwArgumentValidationError('id', {}, {message: 'Item not found'})
                }
                const tax = validTaxes.find(t => t.id === item.taxId)
                calcItem = await CalculationItem.create({
                    ...data,
                    taxId: item.taxId,
                    taxPercent: tax && tax.value, // tax && (tax.values && tax.values[0].value),
                    calculationId: calcId
                }, options)

            } else {

                calcItem = await CalculationItem.findOne({
                    where: {
                        id,
                        calculationId: calcId
                    },
                    ...options
                })

                if (!calcItem) {
                    throwArgumentValidationError('id', {}, {message: 'Calc Item not found'})
                }

                const item = await Item.findOne({
                    where: {
                        id: calcItem.itemId,
                        clientId: ctx.clientId
                    },
                    ...options
                })

                if (!item) {
                    throwArgumentValidationError('id', {}, {message: 'Item not found'})
                }
                const tax = validTaxes.find(t => t.id === item.taxId)
                await calcItem.update({
                    ...data,
                    taxId: item.taxId,
                    taxPercent: tax && tax.value,// tax && (tax.values && tax.values[0].value)
                }, options)
            }

            await calcItem.calculateMissingValues(calculation)
            await calcItem.save(options)
            await transaction.commit()
            return Calculation.selectOne(calculation.id, ctx)
        } catch (e) {
            transaction.rollback()
            throw (e)
        }
    }

    public static async deleteOne (calcId: number, id: number, ctx: IContextApp): Promise<Calculation> {

        const transaction = await CalculationItem.sequelize.transaction()

        if (!transaction) {
            throw Error('Transaction can\'t be open')
        }
        const options = {transaction, validate: true}
        try {

            const calcItem = await CalculationItem.findOne({
                where: {
                    id: id,
                    calculationId: calcId,
                },
                ...options
            })
            if (!calcItem) {
                throwArgumentValidationError('id', {}, {message: 'Calculation not exists'})
            }

            const calculation = await Calculation.findOne({
                where: {
                    id: calcId,
                    clientId: ctx.clientId,
                    status: CONSTANT_MODEL.CALCULATION_STATUS.OPENED, /** for now **/
                },
                ...options
            })

            if (!calculation) {
                throwArgumentValidationError('id', {}, {message: 'Calculation not editable'})
            }

            await CalculationItem.destroy({
                where: {
                    id: id
                },
                ...options
            })
            await transaction.commit()
            return Calculation.selectOne(calculation.id, ctx)
        } catch (e) {
            transaction.rollback()
            throw (e)
        }
    }
}

@Resolver()
export class CalculationItemResolver {

    @UseMiddleware(checkJWT)
    @Mutation(returns => Calculation, {name: 'deleteCalculationItem'})
    async deleteCalculationItem (@Arg('id', type => Int) id: number,
        @Arg('calcId', type => Int) calcId: number,
        @Ctx() ctx: IContextApp) {
        return CalculationItem.deleteOne(calcId, id, ctx)

    }

    @UseMiddleware(checkJWT)
    @Mutation(returns => Calculation, {name: 'insertUpdateCalculationItem'})
    async insertUpdateCalculationItem (@Arg('data', type => CalculationItemType) data: CalculationItemType,
        @Arg('id', type => Int, {nullable: true}) id: number,
        @Arg('calcId', type => Int) calcId: number,
        @Ctx() ctx: IContextApp) {
        return CalculationItem.insertUpdateOne(calcId, data, id, ctx)
    }
}
